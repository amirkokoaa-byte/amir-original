import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import youtubedl from 'youtube-dl-exec';
import path from 'path';
import { Readable } from 'stream';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API constraints check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Loader API Proxy - Initialization
  app.get("/api/loader/init", async (req, res) => {
    try {
      const { url, format } = req.query;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }
      
      const fetchUrl = `https://loader.to/ajax/download.php?format=${format || '1080'}&url=${encodeURIComponent(url as string)}`;
      const response = await fetch(fetchUrl);
      const data = await response.json();
      
      res.json(data);
    } catch (e: any) {
      console.error('Loader init error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Loader API Proxy - Progress Polling
  app.get("/api/loader/progress", async (req, res) => {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: "ID is required" });
      }
      
      const fetchUrl = `https://p.savenow.to/api/progress?id=${id}`;
      const response = await fetch(fetchUrl);
      const data = await response.json();
      
      res.json(data);
    } catch (e: any) {
      console.error('Loader progress error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Loader API Proxy - File Stream Streaming
  app.get("/api/loader/download", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }
      
      const response = await fetch(url as string);
      if (!response.ok) {
        throw new Error(`Failed to fetch from remote: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      let contentDisposition = response.headers.get('content-disposition');
      const contentLength = response.headers.get('content-length');

      // Force attachment so browsers download it instead of navigating to or playing the video
      if (!contentDisposition || !contentDisposition.includes('attachment')) {
        contentDisposition = `attachment; filename="video-${Date.now()}.mp4"`;
      }

      if (contentType) res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', contentDisposition);
      if (contentLength) res.setHeader('Content-Length', contentLength);

      if (response.body) {
        // dynamic import or require to stream it properly? 
        // We can just use the Readable polyfill provided in server environments
        const nodeStream = Readable.fromWeb(response.body as any);
        nodeStream.pipe(res);
      } else {
        res.status(500).send('No body in response');
      }
    } catch (e: any) {
      console.error('Loader download proxy error:', e);
      if (!res.headersSent) {
        res.status(500).json({ error: e.message });
      }
    }
  });

  // Get Video Info
  app.post('/api/info', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      console.log(`Fetching info for: ${url}`);
      const info = await youtubedl(url, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: [
          'referer:youtube.com',
          'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
        ]
      });

      res.json({ 
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration,
        formats: info.formats,
        extractor: info.extractor
      });
    } catch (error: any) {
      console.error(error);
      const errMsg = error.message || error.stderr || 'Failed to fetch video info';
      res.status(500).json({ error: errMsg });
    }
  });

  // Download Video
  app.get('/api/download', async (req, res) => {
    const { url, format } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      // Get title to set content-disposition
      const info = await youtubedl(url, {
        dumpSingleJson: true,
        noCheckCertificates: true,
      });

      const fileName = `${info.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
      const formatSelection = format === 'audio' ? 'bestaudio' : (format || 'best');

      res.header('Content-Disposition', `attachment; filename="${fileName}"`);
      if (format === 'audio') {
        res.header('Content-Type', 'audio/mpeg');
      } else {
        res.header('Content-Type', 'video/mp4');
      }

      console.log(`Downloading format: ${formatSelection} for URL: ${url}`);

      const subprocess = youtubedl.exec(url, {
        f: formatSelection,
        o: '-', // output to stdout
        noCheckCertificates: true,
        noWarnings: true
      });

      subprocess.stdout?.pipe(res);

      subprocess.on('error', (err) => {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).send('Error during download');
        }
      });

      req.on('close', () => {
        subprocess.kill('SIGKILL');
      });

    } catch (error) {
      console.error(error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download video' });
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
