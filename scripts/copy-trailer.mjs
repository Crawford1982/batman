import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist/trailer',{recursive:true});
for(const file of ['index.html','opening.jpg','captions.vtt','Gotham-After-Dark-Trailer.mp4']) await copyFile('trailer/'+file,'dist/trailer/'+file);
