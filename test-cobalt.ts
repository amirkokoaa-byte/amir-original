import ytdl from '@distube/ytdl-core';
async function run() {
  try {
    const info = await ytdl.getInfo('https://www.youtube.com/watch?v=kffacxfA7G4');
    console.log("Success:", info.videoDetails.title);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
