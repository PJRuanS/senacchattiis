// server.js
// Servidor Express e Socket.IO para o Chat Senac

// 1. IMPORTAÇÕES
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); // Para criptografar senhas

// 2. CONFIGURAÇÃO BÁSICA DO APP
const app = express();
const server = http.createServer(app);
// Habilita o CORS para permitir que o front-end (login.html, registro.html) se conecte
const io = new Server(server, {
    cors: {
        origin: "*", // Permite acesso de qualquer origem, ideal para o Render/desenvolvimento
        methods: ["GET", "POST"]
    }
});

// A porta será a variável de ambiente PORT (usada pelo Render) ou 10000
const PORT = process.env.PORT || 10000;
const MONGODB_URI = process.env.MONGODB_URI;

// 3. MIDDLEWARE
app.use(express.json()); // Permite que o Express leia o JSON do corpo das requisições
app.use(cors());         // Permite requisições de outras origens

// Configuração para servir arquivos estáticos (index.html, login.html, etc.)
app.use(express.static(path.join(__dirname)));


// 4. CONFIGURAÇÃO DO MONGOOSE E CONEXÃO COM O DB

// Garante que a URI está configurada
if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI não está definida no ambiente.");
    // No Render, a variável deve ser configurada manualmente.
} else {
    // Conexão com o MongoDB
    mongoose.connect(MONGODB_URI)
        .then(() => {
            console.log("✅ Conexão com MongoDB estabelecida com sucesso!");
        })
        .catch(err => {
            console.error("❌ Erro de conexão com MongoDB:", err.message);
            // O erro 'querySrv ENOTFOUND' ocorre aqui se a URI estiver errada.
            // O erro é no DNS, que não consegue resolver o host do MongoDB.
            console.error("Dica: Verifique se a variável MONGODB_URI está correta e se o Acesso à Rede no MongoDB Atlas permite a conexão (0.0.0.0/0).");
        });
}


// 5. DEFINIÇÃO DO MODELO DE USUÁRIO (Schema)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    cpf: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Armazenaremos o hash da senha
    // Outros campos como nome, telefone, etc., podem ser adicionados aqui
}, { timestamps: true });

const User = mongoose.model('User', userSchema);


// 6. ROTAS DA API

// Rota de Cadastro de Novo Usuário (POST /registro)
app.post('/registro', async (req, res) => {
    const { username, email, cpf, senha } = req.body;

    if (!username || !email || !cpf || !senha) {
        return res.status(400).json({ message: "Todos os campos obrigatórios devem ser preenchidos." });
    }

    try {
        // 1. Verifica se o usuário/email/cpf já existe
        const existingUser = await User.findOne({ $or: [{ email }, { cpf }] });
        if (existingUser) {
            return res.status(409).json({ message: "E-mail ou CPF já cadastrado." });
        }

        // 2. Criptografa a senha antes de salvar
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(senha, salt);

        // 3. Cria e salva o novo usuário
        const newUser = new User({
            username,
            email,
            cpf,
            password: hashedPassword
        });

        await newUser.save();

        res.status(201).json({ message: "Usuário cadastrado com sucesso!" });

    } catch (error) {
        console.error("Erro no registro:", error);
        res.status(500).json({ message: "Erro interno do servidor ao registrar usuário." });
    }
});

// Rota de Login de Usuário (POST /login)
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ message: "E-mail e senha são obrigatórios." });
    }

    try {
        // 1. Encontra o usuário pelo e-mail
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Credenciais inválidas. E-mail não encontrado." });
        }

        // 2. Compara a senha fornecida com o hash armazenado
        const isMatch = await bcrypt.compare(senha, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Credenciais inválidas. Senha incorreta." });
        }

        // 3. Login bem-sucedido
        // Retorna o username para ser salvo no localStorage do front-end
        res.status(200).json({ message: "Login bem-sucedido!", username: user.username });

    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ message: "Erro interno do servidor durante o login." });
    }
});


// Rota para o root (/) que deve redirecionar ou servir o HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// 7. LÓGICA DO CHAT COM SOCKET.IO
io.on('connection', (socket) => {
    console.log(`[Socket.IO] Novo usuário conectado: ${socket.id}`);

    // Guarda o nome do usuário associado a este socket
    let currentUserName = "Anônimo"; 

    // Ouve quando o usuário se junta (enviado pelo chat.html)
    socket.on('user_join', (username) => {
        currentUserName = username;
        console.log(`[Socket.IO] Usuário ${currentUserName} se juntou ao chat.`);
        // Opcional: Avisar outros usuários que um novo membro se juntou
        // socket.broadcast.emit('mensagem', { user: 'Sistema', text: `${currentUserName} entrou na sala.` });
    });

    // Ouve por novas mensagens
    socket.on('mensagem', (msg) => {
        // msg deve ser { user: "Nome do Usuário", text: "Mensagem" }
        console.log(`[Chat] Mensagem de ${msg.user}: ${msg.text}`);

        // Re-emite a mensagem para TODOS os clientes conectados (incluindo quem enviou)
        io.emit('mensagem', msg);
        
        // Futuramente, a mensagem pode ser salva no MongoDB aqui.
    });

    // Ouve quando um cliente se desconecta
    socket.on('disconnect', () => {
        console.log(`[Socket.IO] Usuário desconectado: ${socket.id} (${currentUserName})`);
        // Opcional: Avisar que o usuário saiu
        // socket.broadcast.emit('mensagem', { user: 'Sistema', text: `${currentUserName} saiu da sala.` });
    });
});


// 8. INICIALIZAÇÃO DO SERVIDOR
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta: ${PORT}`);
    console.log(`API do Chat acessível em http://localhost:${PORT}`);
    if (MONGODB_URI) {
        // Mostra o host da URI para facilitar o debug (pode ser o que está incorreto)
        const host = MONGODB_URI.substring(MONGODB_URI.lastIndexOf('@') + 1, MONGODB_URI.lastIndexOf('/'));
        console.log(`Host do MongoDB: ${host}`);
    }
});
