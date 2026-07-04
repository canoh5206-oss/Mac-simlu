const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites
    ]
});

// Basit veri tutma (Gerçek projede 'fs' ile JSON dosyasına yazman önerilir)
const db = { bakiye: {}, ant: {}, lastPen: {}, lastAnt: {}, davet: {} };

client.on('ready', () => console.log(`${client.user.tag} aktif!`));

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('.')) return;
    
    const args = message.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const user = message.author.id;

    // .yardım
    if (cmd === 'yardım') {
        const embed = new EmbedBuilder().setTitle('Ekonomi & Lig Sistemi').setColor(0xFF0000)
            .addFields(
                { name: '⚽ Lig', value: '.pen (Penaltı)\n.ant (Antrenman 10/1)' },
                { name: '✉️ Davet', value: '.davet [@üye]\n.davetsirala' },
                { name: '🪙 Ekonomi', value: '.bal\n.send @üye miktar\n.bütçe' }
            );
        message.channel.send({ embeds: [embed] });
    }

    // .bal
    if (cmd === 'bal') {
        message.reply(`Bakiye: ${db.bakiye[user] || 0} cash.`);
    }

    // .pen (Ödülsüz)
    if (cmd === 'pen') {
        const now = Date.now();
        if (db.lastPen[user] && now - db.lastPen[user] < 3600000) return message.reply("⏱️ 1 saat beklemen lazım!");
        const results = ["GOL!", "DİREK!", "AUT!", "KALECİ!"];
        message.reply(`⚽ Penaltı: **${results[Math.floor(Math.random() * results.length)]}**`);
        db.lastPen[user] = now;
    }

    // .ant (Ödülsüz, 10/1 aşamalı)
    if (cmd === 'ant') {
        const now = Date.now();
        if (db.lastAnt[user] && now - db.lastAnt[user] < 3600000) return message.reply("⏱️ 1 saat beklemen lazım!");
        db.ant[user] = (db.ant[user] || 0) + 1;
        if (db.ant[user] >= 10) {
            message.reply("🏃‍♂️ 10/10 tamamlandı! İlerleme sıfırlandı.");
            db.ant[user] = 0;
        } else {
            message.reply(`🏃‍♂️ Antrenman: ${db.ant[user]}/10`);
        }
        db.lastAnt[user] = now;
    }

    // .davetsirala (Örnek)
    if (cmd === 'davetsirala') {
        message.reply("🏆 İlk 10 sıralaması hesaplanıyor...");
    }
});

client.login('TOKENINI_BURAYA_YAZ');

                   
