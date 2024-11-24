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

app.use(express.json()); // мідлвар для обробки сирого тексту
const upload = multer(); // мідлвар для роботи з multipart/form-data

/**
 * @openapi
 * /notes/{note}:
 *   get:
 *     description: Відповідає за одержання нотатки.
 *     parameters:
 *       - name: note
 *         in: path
 *         description: Назва нотатки
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Текст нотатки був успішно одержаний.
 *       400:
 *         description: Нотатки не знайдено.
 */
app.get('/notes/:noteName', (req, res) => {
    const notePath = path.join(cacheDir, req.params.noteName + '.txt');
    if (!fs.existsSync(notePath)) {
      return res.status(404).send('Not found');
    }
    const noteContent = fs.readFileSync(notePath, 'utf-8');
    res.send(noteContent);
  });

 /**
 * @openapi
 * /notes/{note}:
 *   put:
 *     description: Відповідає за оновлення нотатки.
 *     parameters:
 *       - name: note
 *         in: path
 *         description: Назва нотатки
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         text/plain:
 *           schema:
 *             type: string
 *             description: Текст нотатки
 *     responses:
 *       200:
 *         description: Текст нотатки був вдало змінений.
 *       400:
 *         description: Якщо не було знайдено відповідну нотатку.
 */ 
  app.put('/notes/:noteName', express.text(), (req, res) => {
    const notePath = path.join(cacheDir, req.params.noteName + '.txt');
    if (!fs.existsSync(notePath)) {
      return res.status(404).send('Not found');
    }
    fs.writeFileSync(notePath, req.body);
    res.send('Note updated');
  });

  /**
 * @openapi
 * /notes/{note}:
 *   delete:
 *     description: Відповідає за видалення нотатки.
 *     parameters:
 *       - name: note
 *         in: path
 *         description: Назва нотатки
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Нотатка була вдало видалена.
 *       400:
 *         description: Нотатки для видалення не знайдено.
 */
  app.delete('/notes/:noteName', (req, res) => {
    const notePath = path.join(cacheDir, req.params.noteName + '.txt');
    if (!fs.existsSync(notePath)) {
      return res.status(404).send('Not found');
    }
    fs.unlinkSync(notePath);
    res.send('Note deleted');
  });

  /**
 * @openapi
 * /notes:
 *   get:
 *     description: Відповідає за одержання JSON з нотатками.
 *     responses:
 *       200:
 *         description: JSON з нотатками був успішно одержаний.
 */
  app.get('/notes', (req, res) => {
    const notes = fs.readdirSync(cacheDir).map(file => {
      const noteName = path.parse(file).name;
      const noteText = fs.readFileSync(path.join(cacheDir, file), 'utf-8');
      return { name: noteName, text: noteText };
    });
    res.json(notes);
  });

  /**
 * @openapi
 * /write:
 *   post:
 *     description: Відповідає за додавання нової нотатки.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               note_name:
 *                 type: string
 *                 description: назва нотатки
 *               note:
 *                 type: string
 *                 description: текст нотатки
 *     responses:
 *       201:
 *         description: У разі вдалого створення нотатки.
 *       400:
 *         description: Некоректний запит у разі існування такої нотатки.
 */
  app.post('/write', upload.none(), (req, res) => {   //метод none() то значить файли відсутні, працюємо тільки з текстом
    const { note_name, note } = req.body;
    const notePath = path.join(cacheDir, note_name + '.txt');
    
    if (fs.existsSync(notePath)) {
      return res.status(400).send('Note already exists');
    }
    
    fs.writeFileSync(notePath, note);
    res.status(201).send('Note created');
  });
 
/**
 * @openapi
 * /UploadForm.html:
 *   get:
 *     description: Відповідає за одержання форми для додавання нової нотатки.
 *     responses:
 *       200:
 *         description: Форма з нотатками була успішно одержана.
 *       500:
 *         description: Форма з нотатками загубилась.
 */  
  app.get('/UploadForm.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'UploadForm.html'));
  });

  //<swagger>
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const options_swagger = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Моя документація для нотаток',
      version: '1.0.0',
    },
  },
  apis: ['./main.js'],
};

const openapiSpecification = swaggerJsdoc(options_swagger);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpecification));
//</swagger>

// Запуск сервера
app.listen(options.port, options.host, () => {
  console.log(`Сервер запущено на http://${options.host}:${options.port}`);
});
