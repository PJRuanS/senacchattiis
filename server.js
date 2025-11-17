const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http'); 
const { Server } = require('socket.io'); 

const app = express();

// Configurações de Ambiente
const PORT = process.env.PORT || 3000; 
// Use a variável de ambiente do Render, ou uma URL local de fallback (mude 'SUA_URI_DO_MONGODB_AQUI')
const MONGODB_URI = process.env.MONGODB_URI || 'SUA_URI_DO_MONGODB_AQUI'; 

// Cria o servidor HTTP a partir do Express (Necessário para o Socket.IO)
const server = http.createServer(app); 

// ===================================
// 1. DEFINIÇÃO DO MODELO MONGOOSE (User Model)
// ===================================
const UserSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    cpf: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    // ATENÇÃO: Em um projeto real, 'senha' DEVE ser hasheada com bcrypt!
    senha: { type: String, required: true }, 
    // Saldo inicial para o simulador
    saldo: { type: Number, default: 1000.00 }
});
const User = mongoose.model('User', UserSchema);

// ===================================
// 2. CONEXÃO COM O MONGODB
// ===================================
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Conectado ao MongoDB Atlas com sucesso!'))
    .catch(err => console.error('❌ Erro na conexão com o MongoDB:', err));

// ===================================
// 3. CONFIGURAÇÃO DE MIDDLEWARES
// ===================================
app.use(cors());
app.use(express.json()); 

// ===================================
// 4. CONFIGURAÇÃO DO SOCKET.IO
// ===================================
const io = new Server(server, {
    cors: {
        // Permite conexões de qualquer origem (necessário para o Front-end)
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// ===================================
// 5. ROTAS DE AUTENTICAÇÃO E HEALTH CHECK
// ===================================

// ROTA DE HEALTH CHECK (/)
app.get('/', (req, res) => {
    res.status(200).json({ 
        message: 'Servidor Senac Simulador está ativo!',
        status: 'ok',
        database: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'
    });
});

// Rota de REGISTRO (/api/registro)
app.post('/api/registro', async (req, res) => {
    // Nota: O CPF é obrigatório no modelo
    const { nome, cpf, email, senha } = req.body; 

    try {
        if (await User.findOne({ $or: [{ email }, { cpf }] })) {
            return res.status(400).json({ message: 'E-mail ou CPF já cadastrado.' });
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
            
            // Retorna dados para o Front-end
            return res.status(200).json({ 
                message: 'Login bem-sucedido!',
                nome: user.nome, 
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


// ===================================
// 6. LÓGICA DO CHAT SOCKET.IO
// ===================================
io.on('connection', (socket) => {
    console.log(`[Socket.IO] Novo usuário conectado: ${socket.id}`);

    socket.on('user_join', (username) => {
        console.log(`[Chat] Usuário ${username} entrou.`);
        socket.broadcast.emit('system_message', `${username} entrou na sala.`);
    });

    socket.on('mensagem', (data) => {
        console.log(`[Mensagem Recebida] De: ${data.user}, Texto: ${data.text}`);
        // io.emit envia a mensagem para TODOS os clientes conectados (global chat)
        io.emit('mensagem', data); 
    });

    socket.on('disconnect', () => {
        console.log(`[Socket.IO] Usuário desconectado: ${socket.id}`);
    });
});


// ===================================
// 7. Inicia o Servidor HTTP
// ===================================
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta: ${PORT}`);
});
