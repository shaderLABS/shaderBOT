import express from 'express';
import path from 'path';
import helmet from 'helmet';

const port = process.env.PORT || 3001;
const dirname = path.resolve();
const app = express();

app.use(helmet());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World');
});

export function startWebserver() {
    app.listen(port, () => console.log(`Started web server on port ${port}.`));
}
