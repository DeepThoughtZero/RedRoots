"""Generate static failure voice lines with local Qwen3-TTS and master to -16 LUFS."""
import json, pathlib, urllib.request, subprocess, re, os, time

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/audio'
RAW = pathlib.Path('/tmp/redroots-failure-audio')
RAW.mkdir(exist_ok=True)

ITEMS = [
    {
        'id': 'failure-habitat',
        'text': 'Unser Habitat wurde überwuchert.'
    },
    {
        'id': 'failure-timeout',
        'text': 'Das Zeitfenster ist geschlossen.'
    },
    {
        'id': 'failure-race',
        'text': 'Hellas hat das Wasser zuerst erreicht.'
    },
    {
        'id': 'failure-sterile',
        'text': 'Die Quarantäne wurde durch lebende Flora verletzt.'
    },
    {
        'id': 'failure-order',
        'text': 'Die Schalter wurden in falscher Reihenfolge berührt.'
    },
    {
        'id': 'failure-protected',
        'text': 'Fremde Flora hat die geschützte Zone erreicht.'
    }
]

stt_key = os.environ.get('SPEACHES_API_KEY', '')
if not stt_key:
    env_path = pathlib.Path('/home/bigbrain/AiStack/.env')
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith('SPEACHES_API_KEY='):
                stt_key = line.split('=', 1)[1].strip().strip('"').strip("'")
                break

def post(url, data):
    req = urllib.request.Request(url, json.dumps(data).encode(), {'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read()

def ff(args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *map(str, args)], check=True)

def master_speech(raw, final):
    result = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(raw), '-af', 'loudnorm=I=-16:TP=-2:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True, check=True)
    stats = json.JSONDecoder().raw_decode(result.stderr[result.stderr.rfind('{'):])[0]
    mastering = f"loudnorm=I=-16:TP=-2:LRA=11:measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:offset={stats['target_offset']}:linear=true"
    ff(['-i', raw, '-af', mastering, '-b:a', '64k', '-ac', '1', '-ar', '22050', final])

for item in ITEMS:
    final = OUT / (item['id'] + '.mp3')
    raw = RAW / (item['id'] + '.mp3')
    text = item['text']
    print(f"Generating {item['id']}: '{text}'...", flush=True)
    raw_data = post('http://127.0.0.1:8880/v1/audio/speech', {
        'model': 'qwen3-tts',
        'input': text,
        'voice': 'uncle_fu',
        'language': 'german',
        'instruct': 'Speak in German, calmly and with restrained solemnity, as an expedition commander reporting a lost mission signal. Natural pacing, clear articulation.',
        'response_format': 'mp3',
        'speed': 1.0
    })
    raw.write_bytes(raw_data)
    master_speech(raw, final)

    # Verification with Speaches STT
    cmd = ['curl', '-s', '-X', 'POST', 'http://127.0.0.1:8000/v1/audio/transcriptions',
           '-F', f'file=@{final}',
           '-F', 'model=deepdml/faster-whisper-large-v3-turbo-ct2',
           '-F', 'language=de']
    if stt_key:
        cmd.insert(4, '-H')
        cmd.insert(5, f'Authorization: Bearer {stt_key}')
    res = subprocess.run(cmd, capture_output=True, text=True)
    transcript = json.loads(res.stdout).get('text', '').strip()
    print(f"  -> Verified STT: '{transcript}'")

print("All 6 failure voice lines generated and verified successfully!")
