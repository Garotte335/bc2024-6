const express = require('express');
const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const program = new Command();

// Налаштування командного рядка
program
  .requiredOption('-h, --host <host>', 'Server host')
  .requiredOption('-p, --port <port>', 'Server port')
  .requiredOption('-c, --cache <path>', 'Path to cache directory')
  .parse(process.argv);

const options = program.opts();

const cacheDir = path.resolve(options.cache);
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

app.use(express.json());
const upload = multer();

app.get('/notes/:noteName', (req, res) => {
    const notePath = path.join(cacheDir, req.params.noteName + '.txt');
    if (!fs.existsSync(notePath)) {
      return res.status(404).send('Not found');
    }
    const noteContent = fs.readFileSync(notePath, 'utf-8');
    res.send(noteContent);
  });

  app.put('/notes/:noteName', express.text(), (req, res) => {
    const notePath = path.join(cacheDir, req.params.noteName + '.txt');
    if (!fs.existsSync(notePath)) {
      return res.status(404).send('Not found');
    }
    fs.writeFileSync(notePath, req.body);
    res.send('Note updated');
  });

  app.delete('/notes/:noteName', (req, res) => {
    const notePath = path.join(cacheDir, req.params.noteName + '.txt');
    if (!fs.existsSync(notePath)) {
      return res.status(404).send('Not found');
    }
    fs.unlinkSync(notePath);
    res.send('Note deleted');
  });

  app.get('/notes', (req, res) => {
    const notes = fs.readdirSync(cacheDir).map(file => {
      const noteName = path.parse(file).name;
      const noteText = fs.readFileSync(path.join(cacheDir, file), 'utf-8');
      return { name: noteName, text: noteText };
    });
    res.json(notes);
  });

  app.post('/write', upload.none(), (req, res) => {
    const { note_name, note } = req.body;
    const notePath = path.join(cacheDir, note_name + '.txt');
    
    if (fs.existsSync(notePath)) {
      return res.status(400).send('Note already exists');
    }
    
    fs.writeFileSync(notePath, note);
    res.status(201).send('Note created');
  });
  
  app.get('/UploadForm.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'UploadForm.html'));
  });

// Запуск сервера
app.listen(options.port, options.host, () => {
  console.log(`Сервер запущено на http://${options.host}:${options.port}`);
});