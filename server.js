const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors'); // Necessário para permitir requisições de outras origens
const { Server } = require('socket.io');

const app = express();

// ===================================
// 1. CONFIGURAÇÕES DE AMBIENTE
// ===================================
const PORT = process.env.PORT || 3000;
// A variável de ambiente do Render será usada automaticamente
const MONGODB_URI = process.env.MONGODB_URI || 'SUA_URI_DO_MONGODB_AQUI'; 

// Cria o servidor HTTP a partir do Express (ESSENCIAL para o Socket.IO)
const server = http.createServer(app);

// ===================================
// 2. CONEXÃO COM O MONGODB
// ===================================
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Conexão com MongoDB estabelecida com sucesso!'))
    .catch(err => {
        console.error('❌ ERRO AO CONECTAR AO MONGODB:', err);
    });

// ===================================
// 3. DEFINIÇÃO DO MODELO MONGOOSE (User Model)
// ===================================
const UserSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    cpf: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    // Lembrete: Use bcrypt para hash de senha em produção!
    senha: { type: String, required: true },
    saldo: { type: Number, default: 1000.00 }
});
const User = mongoose.model('User', UserSchema);


// ===================================
// 4. MIDDLEWARE DO EXPRESS
// ===================================
// Habilita o CORS para requisições externas
app.use(cors());
// Serve os arquivos estáticos da pasta 'public' (necessário se o seu frontend estiver junto)
app.use(express.static(path.join(__dirname, 'public')));
// Middleware para parsear o corpo das requisições como JSON
app.use(express.json());

// ===================================
// 5. CONFIGURAÇÃO DO SOCKET.IO
// ===================================
const io = new Server(server, {
    cors: {
        // Permite conexões de qualquer origem para o Socket.IO
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// ===================================
// 6. ROTAS DE AUTENTICAÇÃO E DADOS
// ===================================

// ROTA DE HEALTH CHECK (/)
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        message: 'Servidor Senac API está no ar e respondendo!',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Rota de REGISTRO (/api/registro)
app.post('/api/registro', async (req, res) => {
    const { nome, cpf, email, senha } = req.body;

    try {
        if (await User.findOne({ $or: [{ email }, { cpf }] })) {
            return res.status(400).json({ message: 'E-mail ou CPF já cadastrados.' });
        }

        const newUser = new User({ nome, cpf, email, senha });
        await newUser.save();

        res.status(201).json({
            message: 'Usuário registrado com sucesso!',
            nome: newUser.nome,
            email: newUser.email,
            saldo: newUser.saldo
        });
    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ message: 'Erro interno no servidor ao registrar.' });
    }
});

// Rota de LOGIN (/api/login)
app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;

    try {
        const user = await User.findOne({ email: email });

        if (user && user.senha === senha) {
            console.log(`Login bem-sucedido: ${user.nome}`);
            
            return res.status(200).json({
                message: 'Login bem-sucedido!',
                username: user.nome, // Nome do campo esperado pelo frontend
                email: user.email,
                saldo: user.saldo
            });
        } else {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro interno no servidor ao logar.' });
    }
});

// Rota para fornecer a lista de cursos (dados mockados)
app.get('/api/cursos', (req, res) => {
    const cursos = [
        { id: 1, titulo: "Técnico em Informática para Internet", duracao: "1.200h", inicio: "12/03/2024", modalidade: "Presencial", img: "https://placehold.co/150x100/1A4099/FFFFFF?text=Info" },
        { id: 2, titulo: "Especialização Técnica em Desenvolvimento Mobile", duracao: "360h", inicio: "05/05/2024", modalidade: "EAD", img: "https://placehold.co/150x100/1A4099/FFFFFF?text=Mobile" },
        { id: 3, titulo: "Programador Web - Java", duracao: "300h", inicio: "10/06/2024", modalidade: "Presencial", img: "https://placehold.co/150x100/1A4099/FFFFFF?text=Java" },
        { id: 4, titulo: "Técnico em Redes de Computadores", duracao: "1.000h", inicio: "01/08/2024", modalidade: "Presencial", img: "https://placehold.co/150x100/1A4099/FFFFFF?text=Redes" }
    ];
    res.json(cursos);
});


// ===================================
// 7. LÓGICA DO CHAT (SOCKET.IO)
// ===================================
io.on('connection', (socket) => {
    console.log('[Socket.IO] Novo usuário conectado:', socket.id);

    socket.on('user_join', (username) => {
        console.log(`[Chat] Usuário ${username} entrou.`);
        // Envia uma mensagem de sistema para TODOS OS OUTROS
        socket.broadcast.emit('system_message', `${username} entrou na sala.`);
    });

    socket.on('mensagem', (data) => {
        console.log(`[Mensagem Recebida] De: ${data.user}, Texto: ${data.text}`);
        // io.emit envia para TODOS (incluindo o remetente). Se você quiser que o remetente não veja, use socket.broadcast.emit
        io.emit('mensagem', data);
    });

    socket.on('disconnect', () => {
        console.log('[Socket.IO] Usuário desconectado:', socket.id);
    });
});

// ===================================
// 8. INICIALIZAÇÃO DO SERVIDOR HTTP
// IMPORTANTE: O Socket.IO precisa do 'server' HTTP para rodar!
// ===================================
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
