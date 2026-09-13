"""CPU sound-design fallback: existing AudioGen wind plus restrained synthetic layers."""
import pathlib,subprocess,json
root=pathlib.Path(__file__).resolve().parents[1];out=root/'assets/audio';tmp=pathlib.Path('/tmp/redroots-designed-audio');tmp.mkdir(exist_ok=True)
# Continuous envelopes and integer-cycle oscillators avoid impulsive loop boundaries.
profiles={
'research':('lowpass=f=650,volume=0.35','0.012*sin(2*PI*90*t)+0.004*sin(2*PI*180*t)','Ventilation and electrical hum inside the research station'),
'canyon':('highpass=f=240,lowpass=f=3400,aecho=0.8:0.65:140|310:0.25|0.12,volume=0.8','0.004*sin(2*PI*130*t)*(0.6+0.4*sin(2*PI*t/12))','Resonant canyon wind'),
'ice':('highpass=f=850,lowpass=f=4700,volume=0.3','0.0025*sin(2*PI*1300*t)*pow(0.5+0.5*cos(2*PI*t/6),40)+0.003*sin(2*PI*65*t)','Thin icy air, sparse soft crystalline resonances'),
'outpost':('lowpass=f=1900,volume=0.5','0.013*sin(2*PI*55*t)*(0.85+0.15*sin(2*PI*3*t))+0.004*sin(2*PI*110*t)','Generator vibration and dusty outpost wind')}
for name,(effect,osc,description) in profiles.items():
 osc = osc.replace(',', '\\,')
 wav=tmp/(name+'.wav')
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-stream_loop','-1','-i',str(out/'mars-ambient.mp3'),'-f','lavfi','-i',f'aevalsrc={osc}:s=32000:d=60','-filter_complex',f'[0:a]{effect},atrim=duration=60[w];[w][1:a]amix=inputs=2:normalize=0,afade=t=in:d=1,afade=t=out:st=59:d=1[a]','-map','[a]','-t','60',str(wav)],check=True)
 target='loudnorm=I=-23:TP=-3:LRA=6'
 log=subprocess.run(['ffmpeg','-hide_banner','-i',str(wav),'-af',target+':print_format=json','-f','null','-'],capture_output=True,text=True,check=True).stderr
 d=json.JSONDecoder().raw_decode(log[log.rfind('{'):])[0]
 norm=target+f":measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}:linear=true"
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-af',norm,'-ac','1','-ar','32000','-b:a','64k',str(out/f'mars-{name}.mp3')],check=True)
 print('Designed',name,flush=True)
(out/'ambience-manifest.json').write_text(json.dumps({'method':'CPU sound design using existing AudioGen Mars ambience and synthesized layers; short fades at loop boundaries. GPU generation unavailable.','profiles':{k:v[2] for k,v in profiles.items()}},indent=2))
