const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // Pacote para MongoDB
// O Socket.IO também precisa ser configurado aqui, mas para focar na API de Registro/Login...
const mongoose = require('mongoose');
const http = require('http'); // 1. IMPORTAÇÃO NECESSÁRIA PARA O SERVIDOR HTTP
const { Server } = require('socket.io'); // 2. IMPORTAÇÃO NECESSÁRIA PARA O SOCKET.IO

const app = express();
// Configura a porta para usar a variável do Render (process.env.PORT), ou 3000 localmente
const PORT = process.env.PORT || 3000; 
const MONGODB_URI = process.env.MONGODB_URI; // Variável de ambiente do Render
// Cria um servidor HTTP a partir do Express (essencial para o Socket.IO)
const server = http.createServer(app); 
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// ===================================
// 1. CONFIGURAÇÃO DO SOCKET.IO
// ===================================
const io = new Server(server, {
    cors: {
        // Permite conexões de qualquer origem para o Socket.IO
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// ===================================
// 1. CONEXÃO COM O MONGODB
// 2. CONEXÃO COM O MONGODB
// ===================================
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Conectado ao MongoDB Atlas com sucesso!'))
@@ -31,8 +42,7 @@ app.use(cors());
app.use(express.json()); 

// ===================================
// 2. ROTA DE HEALTH CHECK (/)
// Para verificar se o servidor está no ar
// 3. ROTA DE HEALTH CHECK (/)
// ===================================
app.get('/', (req, res) => {
    res.status(200).json({ 
@@ -42,20 +52,18 @@ app.get('/', (req, res) => {
});

// ===================================
// 3. Rota de REGISTRO (/api/registro)
// 4. Rota de REGISTRO (/api/registro)
// ===================================
app.post('/api/registro', async (req, res) => {
    const { nome, cpf, email, senha } = req.body;

    // (Validações de dados omitidas por brevidade)

    try {
        // Verifica se o e-mail ou CPF já existem no banco de dados
        if (await User.findOne({ $or: [{ email }, { cpf }] })) {
            return res.status(400).json({ message: 'E-mail ou CPF já cadastrado.' });
        }

        // Cria e salva o novo usuário no DB
        const newUser = new User({ nome, cpf, email, senha });
        await newUser.save();

@@ -69,26 +77,24 @@ app.post('/api/registro', async (req, res) => {
});

// ===================================
// 4. Rota de LOGIN (/api/login)
// 5. Rota de LOGIN (/api/login)
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
            // NOTA: O frontend espera que a rota de login retorne o nome do usuário 
            // no campo 'nome' para salvar no localStorage, então estou ajustando.
            return res.status(200).json({ 
                message: 'Login bem-sucedido!',
                user: { nome: user.nome, email: user.email } // Retorna dados básicos
                nome: user.nome, // Retorna 'nome' para ser salvo no cliente como 'senacUser'
                email: user.email 
            });
        } else {
            // Usuário não encontrado ou senha incorreta
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

@@ -100,9 +106,38 @@ app.post('/api/login', async (req, res) => {


// ===================================
// 5. Inicia o Servidor
// 6. LÓGICA DO CHAT SOCKET.IO
// ===================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta: ${PORT}`);
io.on('connection', (socket) => {
    console.log(`[Socket.IO] Novo usuário conectado: ${socket.id}`);

    // Quando um usuário se junta à sala, ele envia o nome
    socket.on('user_join', (username) => {
        console.log(`[Chat] Usuário ${username} entrou.`);
        // Envia uma mensagem de sistema para TODOS OS OUTROS
        socket.broadcast.emit('system_message', `${username} entrou na sala.`);
    });

    // Quando o servidor recebe uma mensagem
    socket.on('mensagem', (data) => {
        console.log(`[Mensagem Recebida] De: ${data.user}, Texto: ${data.text}`);
        
        // CORREÇÃO CRÍTICA: Retransmite a mensagem para TODOS OS OUTROS CLIENTES (exceto o remetente).
        // Isso resolve o problema de comunicação em tempo real.
        socket.broadcast.emit('mensagem', data);
    });

    // Quando um usuário se desconecta
    socket.on('disconnect', () => {
        console.log(`[Socket.IO] Usuário desconectado: ${socket.id}`);
    });
});


// ===================================
// 7. Inicia o Servidor HTTP (e não apenas o Express)
// ===================================
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta: ${PORT}`);
    console.log(`API do Chat acessível em http://localhost:${PORT}`);
});
