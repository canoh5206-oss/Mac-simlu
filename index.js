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

// Basit Veri Deposu (Bellek içi)
const db = { bakiye: {}, ant: {}, lastPen: {}, lastAnt: {}, davet: {} };

client.on('ready', () => {
    console.log(`✅ Başarılı: ${client.user.tag} olarak Discord'a giriş yapıldı!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('.')) return;
    
    const args = message.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const user = message.author.id;

    // .yardım / .yardim
    if (cmd === 'yardım' || cmd === 'yardim') {
        const embed = new EmbedBuilder()
            .setTitle('💰 Ekonomi & Lig Sistemi Komutları')
            .setColor(0x00FF00) // Yeşil
            .addFields(
                { name: '⚽ Lig & Eğlence (Ödülsüz)', value: '`.pen` -> Penaltı atarsın (Saatlik)\n`.ant` -> Antrenman yaparsın (10/1 aşamalı, saatlik)', inline: false },
                { name: '✉️ Davet Sistemi', value: '`.davet [@üye]` -> Davet istatistikleri\n`.davetsirala` -> Sunucu ilk 10 davet lideri', inline: false },
                { name: '🪙 Ekonomi', value: '`.bal` -> Nakit gösterir\n`.send @üye [miktar]` -> Para transferi\n`.bütçe` -> Kulüp bütçesini gösterir', inline: false }
            );

        if (message.member.permissions.has('Administrator')) {
            embed.addFields({ name: '👑 Owner / Yönetici Yetkileri', value: '`.paraver` / `.parasil` -> Cash yönetimi\n`.bütçe ekle` / `.bütçe sil` -> Bütçe yönetimi\n`.davetal` / `.davetsil` -> Davet yönetimi', inline: false });
        }
        return message.channel.send({ embeds: [embed] });
    }

    // .bal
    if (cmd === 'bal') {
        const bakiye = db.bakiye[user] || 0;
        return message.reply(`🪙 **${message.author.displayName}**, mevcut nakit bakiyeniz: **${bakiye.toLocaleString()}** cash.`);
    }

    // .pen (Ödülsüz - Saatlik)
    if (cmd === 'pen') {
        const now = Date.now();
        if (db.lastPen[user] && now - db.lastPen[user] < 3600000) {
            const kalanDk = Math.ceil((3600000 - (now - db.lastPen[user])) / 60000);
            return message.reply(`⏱️ Bu komut saatte 1 kez kullanılabilir! Kalan süre: **${kalanDk}** dakika.`);
        }
        const sonuclar = ["⚽ GOL! Muhteşem bir vuruş!", "🥅 DİREK! Top direkten döndü!", "🏟️ AUT! Top dışarı çıktı!", "🧤 KALECİ! Kaleci köşeden çıkarde!"];
        const secilen = sonuclar[Math.floor(Math.random() * sonuclar.length)];
        db.lastPen[user] = now;
        return message.reply(`⚽ **${message.author.displayName}** penaltı kullandı...\n👉 **${secilen}**`);
    }

    // .ant (Ödülsüz - 10/1 Aşamalı)
    if (cmd === 'ant') {
        const now = Date.now();
        if (db.lastAnt[user] && now - db.lastAnt[user] < 3600000) {
            const kalanDk = Math.ceil((3600000 - (now - db.lastAnt[user])) / 60000);
            return message.reply(`⏱️ Antrenman saatte 1 kez yapılabilir! Kalan süre: **${kalanDk}** dakika.`);
        }
        db.ant[user] = (db.ant[user] || 0) + 1;
        db.lastAnt[user] = now;

        if (db.ant[user] >= 10) {
            db.ant[user] = 0;
            return message.reply(`🏃‍♂️ **${message.author.displayName}**, 10/10 antrenmanı tamamladın! İlerlemeniz sıfırlandı.`);
        } else {
            return message.reply(`🏃‍♂️ **${message.author.displayName}**, antrenman yapıldı! İlerleme: **${db.ant[user]}/10**`);
        }
    }
});

// --- CRITICAL TOKEN VE HATA KONTROLÜ ---
const token = process.env.DISCORD_TOKEN;

if (!token) {
    console.error("❌ HATA: Railway Variables kısmında 'DISCORD_TOKEN' bulunamadı veya içi boş!");
    process.exit(1); 
} else {
    console.log("🔍 Bilgi: DISCORD_TOKEN değişkeni tespit edildi, giriş deneniyor...");
    client.login(token).catch(err => {
        console.error("❌ HATA: Discord login başarısız oldu! Token geçersiz veya Privileged Intents ayarları kapalı.", err.message);
        process.exit(1);
    });
}



                   
