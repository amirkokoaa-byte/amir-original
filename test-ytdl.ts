import youtubedl from 'youtube-dl-exec';
async function run() {
  try {
    const info = await youtubedl('https://x.com/elonmusk/status/1785536551101964593', { 
      dumpSingleJson: true,
      jsRuntimes: 'node'
    });
    console.log("Success:", info.title);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
