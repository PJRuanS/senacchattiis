const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // Pacote para MongoDB
const app = express();
// Configura a porta para usar a variável do Render, ou 3000 localmente
const PORT = process.env.PORT || 3000; 
const MONGODB_URI = process.env.MONGODB_URI; // Variável de ambiente do Render

// ===================================
// 1. CONEXÃO COM O MONGODB
// ===================================
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
// 2. Rota de REGISTRO (Usando DB)
// ===================================
app.post('/api/registro', async (req, res) => {
    const { nome, cpf, email, senha } = req.body;

    // ... validações simples (mantidas) ...

    try {
        if (await User.findOne({ $or: [{ email }, { cpf }] })) {
            return res.status(400).json({ message: 'E-mail ou CPF já cadastrado.' });
        }
        
        // Salva o novo usuário no DB
        const newUser = new User({ nome, cpf, email, senha });
        await newUser.save();

        console.log(`Usuário registrado: ${newUser.nome}`);
        return res.status(201).json({ message: 'Cadastro realizado com sucesso!' });

    } catch (error) {
        console.error("Erro ao registrar:", error);
        return res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});


// ... Inclua sua rota de LOGIN (`/api/login`) aqui, alterando para buscar no 'User' model:
// const user = await User.findOne({ email: email, senha: senha });
// ...

// ===================================
// 3. Inicia o Servidor
// ===================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta: ${PORT}`);
});