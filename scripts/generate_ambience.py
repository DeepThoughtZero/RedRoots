#!/usr/bin/env python3
"""Generate 15 seamless ambient MP3s (5 planning, 5 simulation, 5 tension) for RedRoots via AudioGen (RTX 5090)."""

import json
import os
import pathlib
import subprocess
import sys
import time
import urllib.request
import urllib.error

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/audio'
RAW = pathlib.Path('/home/bigbrain/.gemini/antigravity/brain/1d894730-f7af-4e03-b8a4-b151610af26c/scratch/raw-audio')
RAW.mkdir(exist_ok=True, parents=True)

TRACKS = {
    # Planning / Bauphase (Deep focus, quiet Martian wind, soft lab hum, spacious contemplation)
    'mars-planning-1': (
        'Quiet steady Martian wind blowing across a sealed research station, subtle deep electronic drone, '
        'gentle sand brushing solar panels, meditative science fiction thinking atmosphere, no music, no voices, no speech, no alarms, no loud impacts, no rhythmic drums.'
    ),
    'mars-planning-2': (
        'Calm deep space habitat interior, soft air ventilation circulating, faint low frequency electromagnetic hum, '
        'tranquil scientific laboratory ambience, spacious focus, no music, no speech, no alarms, no sudden transients.'
    ),
    'mars-planning-3': (
        'Ethereal quiet Martian twilight atmosphere, thin cold breeze drifting over red volcanic plateaus, '
        'gentle ambient atmospheric breath, tranquil strategic contemplation, no music, no speech, no loud impacts, no rhythmic beats.'
    ),
    'mars-planning-4': (
        'Subtle mechanical life support drone, gentle distant thermal expansion creak, serene Martian outpost observatory, '
        'quiet focus, no music, no speech, no alarms, no heavy impacts.'
    ),
    'mars-planning-5': (
        'Spacious contemplative Mars landscape, gentle dusty air currents whispering over canyon rocks, '
        'soft sub-bass planetary tone, tranquil sci-fi strategy mood, no music, no speech, no voices, no alarms.'
    ),

    # Simulation / Evolution (Emergent biosphere, organic cellular drone, vital life multiplication)
    'mars-simulation-1': (
        'Living Mars biosphere atmosphere, gentle organic cellular hum, rhythmic soft bio-acoustic resonance, '
        'bacterial colonies thriving, mysterious extraterrestrial flora respiration, no music, no speech, no alarms, no loud drums.'
    ),
    'mars-simulation-2': (
        'Dynamic emergent cellular evolution, subtle soft pulsating spore growth, warm organic greenhouse humidity, '
        'gentle planetary ecosystem drone, no music, no speech, no human voices, no alarms.'
    ),
    'mars-simulation-3': (
        'Emergent biological growth in Martian soil, rhythmic gentle life vibrations, subtle vegetative whisper, '
        'calm living Conway colony, no music, no speech, no alarms, no sharp clicks.'
    ),
    'mars-simulation-4': (
        'Martian subterranean water aquifer and botanical bio-chamber, gentle hydrothermal moisture drone, '
        'organic bacterial respiration, serene life multiplying, no music, no speech, no alarms.'
    ),
    'mars-simulation-5': (
        'Soft planetary winds carrying biological spores across red plains, subtle resonant life drone, '
        'expanding green moss and lichen on warm rocks, calm sci-fi ecosystem, no music, no speech, no alarms.'
    ),

    # Tension / Conflict (Ominous Martian wind shear, dark suspense, siege pressure, sandstorm)
    'mars-tension-1': (
        'Ominous Martian wind shear, dark planetary tension, deep subterranean tectonic rumble, '
        'tense strategic standoff, distant dust storm approaching, no music, no speech, no screams, no gunshots.'
    ),
    'mars-tension-2': (
        'Heavy atmospheric pressure against station bulkheads, low vibrating industrial resonance, '
        'tense siege atmosphere, uneasy Martian wind gusts, no music, no speech, no loud explosions.'
    ),
    'mars-tension-3': (
        'Resonant Martian canyon storm wind, deep vibrating metallic tension, distant industrial generator struggling, '
        'defensive perimeter suspense, no music, no speech, no sudden impacts.'
    ),
    'mars-tension-4': (
        'Grim cold wind whistling through contested crater rim, deep pulsing tension drone, '
        'austere tactical Martian outpost under alert, no music, no speech, no sirens, no sharp cracks.'
    ),
    'mars-tension-5': (
        'Low turbulent Martian gale, ominous low-frequency drone, strained metal structures groaning in sandstorm, '
        'intense sci-fi tactical standoff, no music, no speech, no sudden bangs.'
    )
}

def post(url, data):
    req = urllib.request.Request(url, json.dumps(data).encode(), {'Content-Type': 'application/json'})
    for attempt in range(30):
        try:
            with urllib.request.urlopen(req, timeout=120) as response:
                return response.read()
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as error:
            if attempt == 29:
                raise
            print(f'Waiting for AudioGen service ({error}); retry {attempt+1}/30 in 4s...', flush=True)
            time.sleep(4)

def ff(args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *map(str, args)], check=True)

def generate_track(track_id, prompt):
    final_mp3 = OUT / f'{track_id}.mp3'
    if final_mp3.exists() and final_mp3.stat().st_size > 100000:
        print(f'[{track_id}] Exists ({final_mp3.stat().st_size} bytes), skipping.', flush=True)
        return

    print(f'=== [{track_id}] Generating 8 takes via AudioGen ===', flush=True)
    t0 = time.time()
    takes = []
    track_raw_dir = RAW / track_id
    track_raw_dir.mkdir(exist_ok=True, parents=True)

    for i in range(8):
        take_path = track_raw_dir / f'take_{i}.wav'
        if not take_path.exists() or take_path.stat().st_size < 10000:
            audio_bytes = post('http://127.0.0.1:8011/generate', {
                'prompt': prompt,
                'duration': 10.0
            })
            take_path.write_bytes(audio_bytes)
        takes.append(take_path)

    print(f'[{track_id}] Stitching 8 takes with triangular acrossfades...', flush=True)
    inputs = []
    for p in takes:
        inputs.extend(['-i', str(p)])

    chain = ''
    previous = '0:a'
    for i in range(1, 8):
        chain += f'[{previous}][{i}:a]acrossfade=d=2.5:c1=tri:c2=tri[m{i}];'
        previous = f'm{i}'

    combined = track_raw_dir / 'combined.wav'
    ff([*inputs, '-filter_complex', chain[:-1], '-map', f'[{previous}]', str(combined)])

    dur_out = subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(combined)
    ], text=True).strip()
    duration = float(dur_out)
    boundary = duration - 2.5

    loop = track_raw_dir / 'loop.wav'
    # Seamless circular loop seam
    ff([
        '-i', str(combined),
        '-filter_complex',
        f'[0:a]asplit=3[a][b][c];[a]atrim=start=2.5:end={boundary},asetpts=PTS-STARTPTS[mid];[b]atrim=start={boundary},asetpts=PTS-STARTPTS[tail];[c]atrim=end=2.5,asetpts=PTS-STARTPTS[head];[tail][head]acrossfade=d=2.5:c1=tri:c2=tri[seam];[mid][seam]concat=n=2:v=0:a=1[out]',
        '-map', '[out]',
        str(loop)
    ])

    print(f'[{track_id}] 2-pass mastering to -23 LUFS (-3 dBTP)...', flush=True)
    processing = 'highpass=f=70,lowpass=f=6500,acompressor=threshold=-35dB:ratio=2:attack=100:release=1000:makeup=1'
    res = subprocess.run([
        'ffmpeg', '-hide_banner', '-i', str(loop),
        '-af', f'{processing},loudnorm=I=-23:TP=-3:LRA=6:print_format=json',
        '-f', 'null', '-'
    ], capture_output=True, text=True, check=True)

    stats_str = res.stderr[res.stderr.rfind('{'):]
    stats = json.JSONDecoder().raw_decode(stats_str)[0]
    mastering = (
        f"loudnorm=I=-23:TP=-3:LRA=6:"
        f"measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:"
        f"measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:"
        f"offset={stats['target_offset']}:linear=true"
    )

    ff([
        '-i', str(loop),
        '-af', f'{processing},{mastering}',
        '-ar', '32000', '-ac', '1', '-b:a', '64k',
        str(final_mp3)
    ])

    elapsed = time.time() - t0
    size = final_mp3.stat().st_size
    print(f'✓ [{track_id}] Done ({size} bytes, {elapsed:.1f}s)', flush=True)

def main():
    print(f'Starting ambient generation for {len(TRACKS)} tracks...', flush=True)
    total_t0 = time.time()
    for track_id, prompt in TRACKS.items():
        generate_track(track_id, prompt)
    print(f'All {len(TRACKS)} tracks generated and mastered in {time.time() - total_t0:.1f}s!', flush=True)

if __name__ == '__main__':
    main()
