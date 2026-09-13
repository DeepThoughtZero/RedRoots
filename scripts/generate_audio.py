"""Generate static campaign assets with the local AiStack services; never needed by players."""
import json, pathlib, urllib.request, subprocess, re, difflib, hashlib, os, time, urllib.error
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/audio'
RAW = pathlib.Path('/tmp/redroots-audio'); RAW.mkdir(exist_ok=True)
def post(url, data):
    req=urllib.request.Request(url,json.dumps(data).encode(),{'Content-Type':'application/json'})
    for attempt in range(12):
        try:
            with urllib.request.urlopen(req,timeout=1200) as response: return response.read()
        except urllib.error.HTTPError as error:
            if error.code not in (502, 503) or attempt == 11: raise
            print('Audio service is starting; retrying shortly.', flush=True)
            time.sleep(5)
def ff(args): subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*map(str,args)],check=True)
def norm(text): return re.sub(r'[^\w\s]','',text.lower()).split()
# Keep the service credential local; never put it into assets, reports or process arguments.
stt_key = os.environ.get('SPEACHES_API_KEY', '')
if not stt_key:
    env_path = pathlib.Path('/home/bigbrain/AiStack/.env')
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith('SPEACHES_API_KEY='):
                stt_key = line.split('=', 1)[1].strip().strip('"').strip("'")
                break
previous_report = {v['id']: v for v in json.loads((OUT/'verification.json').read_text())} if (OUT/'verification.json').exists() else {}
report=[]
for item in json.loads((OUT/'manifest.json').read_text()):
    final=OUT/(item['id']+'.mp3'); raw=RAW/(item['id']+'.mp3')
    text=re.sub(r'[*#"`_~]','',item['text']).strip()
    text = text.replace('Ares-1', 'Ares eins')
    if text[-1] not in '.!?': text+='.'
    expected_hash = hashlib.sha256(' '.join(norm(text)).encode()).hexdigest()
    stale = previous_report.get(item['id'], {}).get('expectedSpokenSha256') != expected_hash
    if not final.exists() or stale:
        (RAW/(item['id']+'.json')).unlink(missing_ok=True)
        print('Generating',item['id'],flush=True)
        raw.write_bytes(post('http://127.0.0.1:8880/v1/audio/speech',{'model':'qwen3-tts','input':text,'voice':item['voice'],'language':'german','instruct':'Speak in German, calmly and clearly, as a thoughtful expedition narrator. Natural pacing, restrained dramatic tension. No added sounds or laughter.','response_format':'mp3','speed':1.0}))
        ff(['-i',raw,'-af','loudnorm=I=-16:TP=-1.5:LRA=11','-b:a','64k','-ac','1','-ar','22050',final])
    transcript_file=RAW/(item['id']+'.json')
    if transcript_file.exists(): data=json.loads(transcript_file.read_text())
    else:
        res=subprocess.run(['curl','--config','-','-fsS','--retry','2','--retry-all-errors','--retry-delay','3','--max-time','300','http://127.0.0.1:8000/v1/audio/transcriptions','-F',f'file=@{final}','-F','model=deepdml/faster-whisper-large-v3-turbo-ct2','-F','language=de'],input=('header = \"Authorization: Bearer ' + stt_key.replace('\\', '\\\\').replace('\"', '\\\"') + '\"\n') if stt_key else '',capture_output=True,text=True)
        if res.returncode: print('STT unavailable:',res.stderr,flush=True); data={'text':''}
        else: data=json.loads(res.stdout);transcript_file.write_text(json.dumps(data))
    a,b=norm(text),norm(data.get('text','')); similarity=difflib.SequenceMatcher(None,' '.join(a),' '.join(b)).ratio();coverage=len(set(a)&set(b))/max(1,len(set(a)))
    status='pass' if similarity>=.78 and coverage>=.7 else 'review'
    report.append({**item,'transcript':data.get('text',''),'similarity':round(similarity,3),'coverage':round(coverage,3),'status':status,'audioSha256':hashlib.sha256(final.read_bytes()).hexdigest(),'sourceTextSha256':hashlib.sha256(item['text'].encode()).hexdigest(),'expectedSpokenSha256':hashlib.sha256(' '.join(a).encode()).hexdigest()})
    previous_report[item['id']] = report[-1]
    (OUT/'verification.json').write_text(json.dumps(list(previous_report.values()),ensure_ascii=False,indent=2))
    print('Verified',item['id'],status,round(similarity,2),flush=True)
if not (OUT/'mars-ambient.mp3').exists():
    takes=[]
    for i in range(8):
        path=RAW/f'wind-{i}.wav'
        if not path.exists():
            print('Generating ambience',i+1,'/ 8',flush=True)
            path.write_bytes(post('http://127.0.0.1:8011/generate',{'prompt':'Quiet steady dry wind outside a sealed Mars research habitat, soft distant low ventilation hum, gentle sand brushing metal, calm spacious science fiction environmental ambience, no music, no speech, no voices, no alarms, no loud impacts, no rhythmic ticking.','duration':10.0}))
        takes.append(path)
    inputs=[]
    for path in takes: inputs.extend(['-i',path])
    chain=''; previous='0:a'
    for i in range(1,8):
        chain+=f'[{previous}][{i}:a]acrossfade=d=2.5:c1=tri:c2=tri[m{i}];';previous=f'm{i}'
    combined=RAW/'combined.wav';ff([*inputs,'-filter_complex',chain[:-1],'-map',f'[{previous}]',combined])
    duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(combined)]))
    boundary=duration-2.5
    loop=RAW/'loop.wav'
    ff(['-i',combined,'-filter_complex',f'[0:a]asplit=3[a][b][c];[a]atrim=start=2.5:end={boundary},asetpts=PTS-STARTPTS[mid];[b]atrim=start={boundary},asetpts=PTS-STARTPTS[tail];[c]atrim=end=2.5,asetpts=PTS-STARTPTS[head];[tail][head]acrossfade=d=2.5:c1=tri:c2=tri[seam];[mid][seam]concat=n=2:v=0:a=1[out]','-map','[out]',loop])
    processing='highpass=f=70,lowpass=f=6500,acompressor=threshold=-35dB:ratio=2:attack=100:release=1000:makeup=1'
    measurement=subprocess.run(['ffmpeg','-hide_banner','-i',str(loop),'-af',processing+',loudnorm=I=-23:TP=-3:LRA=6:print_format=json','-f','null','-'],capture_output=True,text=True,check=True).stderr
    stats=json.JSONDecoder().raw_decode(measurement[measurement.rfind('{'):])[0]
    mastering=f"loudnorm=I=-23:TP=-3:LRA=6:measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:offset={stats['target_offset']}:linear=true"
    ff(['-i',loop,'-af',processing+','+mastering,'-ar','32000','-ac','1','-b:a','64k',OUT/'mars-ambient.mp3'])
print('Audio generation complete.',flush=True)
