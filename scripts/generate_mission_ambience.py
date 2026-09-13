"""Four additional static mission soundscapes, generated locally with AudioGen."""
import pathlib,json,urllib.request,subprocess
root=pathlib.Path(__file__).resolve().parents[1]; raw=pathlib.Path('/tmp/redroots-mission-ambience');raw.mkdir(exist_ok=True)
prompts={
'research':'Inside an abandoned space research station, quiet steady ventilation, faint electrical hum, sparse soft metal creaks, distant air circulating through pipes, subdued mysterious science fiction atmosphere, no music, no voices, no speech, no alarms, no loud impacts, no rhythmic ticking.',
'canyon':'Wind moving through a deep narrow rocky desert canyon, soft hollow gusts and distant sand sliding over stone, open spacious alien desert environment, gentle airy resonance, no music, no voices, no speech, no loud impacts, no alarms, no rhythmic ticking.',
'ice':'Deep frozen cavern under a desert planet, subdued ice creaking and very sparse delicate ice crackles, soft distant ventilation and low air movement, calm cold spacious atmosphere, no music, no voices, no speech, no dripping water, no loud impacts, no alarms, no rhythmic ticking.',
'outpost':'Exterior of a remote industrial space outpost, low steady generator hum behind a sealed wall, restrained dusty wind, occasional quiet metallic structure creaking, tense distant industrial ambience, no music, no voices, no speech, no gunfire, no loud impacts, no alarms, no rhythmic ticking.'}
def ff(args):subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*map(str,args)],check=True)
for name,prompt in prompts.items():
 final=root/'assets/audio'/f'mars-{name}.mp3'
 if final.exists():continue
 inputs=[]
 for i in range(4):
  path=raw/f'{name}-{i}.wav'
  if not path.exists():
   print(name,i+1,'/4',flush=True)
   req=urllib.request.Request('http://127.0.0.1:8011/generate',json.dumps({'prompt':prompt,'duration':10.}).encode(),{'Content-Type':'application/json'})
   with urllib.request.urlopen(req,timeout=300) as response:path.write_bytes(response.read())
  inputs+=['-i',path]
 combined=raw/f'{name}-combined.wav'
 ff([*inputs,'-filter_complex','[0:a][1:a]acrossfade=d=2.5:c1=tri:c2=tri[a];[a][2:a]acrossfade=d=2.5:c1=tri:c2=tri[b];[b][3:a]acrossfade=d=2.5:c1=tri:c2=tri[c]','-map','[c]',combined])
 duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(combined)]));end=duration-2.5
 loop=raw/f'{name}-loop.wav'
 ff(['-i',combined,'-filter_complex',f'[0:a]asplit=3[a][b][c];[a]atrim=start=2.5:end={end},asetpts=PTS-STARTPTS[mid];[b]atrim=start={end},asetpts=PTS-STARTPTS[tail];[c]atrim=end=2.5,asetpts=PTS-STARTPTS[head];[tail][head]acrossfade=d=2.5:c1=tri:c2=tri[seam];[mid][seam]concat=n=2:v=0:a=1[out]','-map','[out]',loop])
 processing='highpass=f=70,lowpass=f=6500,acompressor=threshold=-35dB:ratio=2:attack=100:release=1000:makeup=1'
 log=subprocess.run(['ffmpeg','-hide_banner','-i',str(loop),'-af',processing+',loudnorm=I=-23:TP=-3:LRA=6:print_format=json','-f','null','-'],capture_output=True,text=True,check=True).stderr
 stats=json.JSONDecoder().raw_decode(log[log.rfind('{'):])[0]
 master=f"loudnorm=I=-23:TP=-3:LRA=6:measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:offset={stats['target_offset']}:linear=true"
 ff(['-i',loop,'-af',processing+','+master,'-ar','32000','-ac','1','-b:a','64k',final])
 print('Finished',name,flush=True)
(root/'assets/audio/ambience-manifest.json').write_text(json.dumps(prompts,indent=2))
