const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // Pacote para MongoDB
// O Socket.IO também precisa ser incluído aqui se você usá-lo, 
// mas para focar na parte do DB/API, vamos mantê-lo simples por enquanto.

const app = express();
// Configura a porta para usar a variável do Render (process.env.PORT), ou 3000 localmente
const PORT = process.env.PORT || 3000; 
const MONGODB_URI = process.env.MONGODB_URI; // Variável de ambiente do Render

// ===================================
// 1. CONEXÃO COM O MONGODB
// ===================================
// MONGODB_URI é injetado pelo Render, contendo a URL do seu Cluster Atlas.
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Conectado ao MongoDB Atlas com sucesso!'))
    .catch(err => console.error('❌ Erro de conexão com MongoDB:', err));

// Esquema do Usuário (Estrutura do DB)
const userSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true },
    cpf: { type: String, required: true, unique: true }
});
const User = mongoose.model('User', userSchema);

// Middlewares
app.use(cors()); 
app.use(express.json()); 

// ===================================
// 2. ROTA DE HEALTH CHECK (/)
// Adicionada aqui para evitar o erro "Cannot GET /"
// ===================================
app.get('/', (req, res) => {
    // Retorna um status 200 (OK) e uma mensagem de saúde do servidor
    res.status(200).json({ 
        status: 'ok', 
        message: 'Servidor de API do chat está ativo e conectado ao DB.' 
    });
});

// ===================================
// 3. Rota de REGISTRO (/api/registro)
// ===================================
app.post('/api/registro', async (req, res) => {
    const { nome, cpf, email, senha } = req.body;
    
    // (Validações de dados omitidas por brevidade, mas devem ser incluídas)

    try {
        // Verifica se o e-mail ou CPF já existem no banco de dados
        if (await User.findOne({ $or: [{ email }, { cpf }] })) {
            return res.status(400).json({ message: 'E-mail ou CPF já cadastrado.' });
        }
        
        // Cria e salva o novo usuário no DB
        const newUser = new User({ nome, cpf, email, senha });
        await newUser.save();

        console.log(`Usuário registrado: ${newUser.nome}`);
        return res.status(201).json({ message: 'Cadastro realizado com sucesso!' });

    } catch (error) {
        console.error("Erro ao registrar:", error);
        return res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

// ===================================
// 4. Rota de LOGIN (/api/login)
// ===================================
app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;

    // (Validações de campos vazios omitidas)

    try {
        // Busca o usuário pelo e-mail e senha no MongoDB
        const user = await User.findOne({ email: email, senha: senha });

        if (user) {
            // Login bem-sucedido
            console.log(`Login bem-sucedido: ${user.nome}`);
            return res.status(200).json({ 
                message: 'Login bem-sucedido!',
                user: { nome: user.nome, email: user.email } // Retorna dados básicos
            });
        } else {
            // Usuário não encontrado ou senha incorreta
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

    } catch (error) {
        console.error("Erro ao fazer login:", error);
        return res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});


// ===================================
// 5. Inicia o Servidor
// ===================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta: ${PORT}`);
});
```
eof

### Próximos Passos Obrigatórios:

1.  **Substitua** o conteúdo do seu `server.js` localmente com este código.
2.  **Commit e Push para o GitHub:**

    ```bash
    git add server.js
    git commit -m "Implementa rotas de registro e login com MongoDB e health check"
    git push origin main
