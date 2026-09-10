import subprocess
from pathlib import Path
filters='''[1:a]volume=0.8,afade=t=in:d=1,afade=t=out:st=19:d=3[bed];[2:a]volume=0.8,adelay=300|300[a];[3:a]volume=0.9,adelay=8900|8900[b];[4:a]volume=0.8,adelay=15500|15500[c];[5:a]lowpass=f=600,volume=0.12,afade=t=out:d=0.8,adelay=7200|7200[hit];[bed][a][b][c][hit]amix=inputs=5:normalize=0,alimiter=limit=0.9,afade=t=out:st=21:d=1[out]'''
cmd=['ffmpeg','-v','error','-y','-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-f','lavfi','-i','aevalsrc=0.06*(sin(2*PI*65.406*t)+0.5*sin(2*PI*77.782*t)+0.35*sin(2*PI*98*t))*(0.7+0.3*sin(2*PI*0.3*t)):s=48000:d=22','-i','public/voices/alfred.mp3','-i','public/voices/batman-air.mp3','-i','public/voices/gordon-safe.mp3','-f','lavfi','-i','anoisesrc=d=0.8:c=brown:r=48000','-filter_complex',filters,'-map','[out]','-t','22','-c:a','aac','-b:a','192k','trailer/soundtrack.m4a']
subprocess.run(cmd,check=True)
print('Soundtrack rendered')
