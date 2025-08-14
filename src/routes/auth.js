// routes/auth.js
import express from 'express';
import { pool } from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();

router.post('/login', async (req, res) => {
    console.log('Tentativa de login recebida:', req.body);

    const { email, senha } = req.body;

    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE email_gf = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ mensagem: 'Credenciais inválidas' });
        }

        const usuario = result.rows[0];

        const senhaCorreta = await bcrypt.compare(senha, usuario.senha_gf);
        if (!senhaCorreta) {
            return res.status(401).json({ mensagem: 'Credenciais inválidas' });
        }

        const token = jwt.sign(
            { id: usuario.id, email: usuario.email_gf, tipo: usuario.tipo_usuario },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // 🔹 Agora enviando também a logo_url
        res.json({
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome_gf,
                tipo: usuario.tipo_usuario,
                logo_url: usuario.logo_url // <-- ESSENCIAL para o Header mostrar a logo
            }
        });

    } catch (erro) {
        console.error(erro);
        res.status(500).json({ mensagem: 'Erro interno do servidor' });
    }
});

export default router;
