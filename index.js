const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const takimKadro = new Map();

client.on('messageCreate', async (message) => {
    const args = message.content.split(' ');
    const komut = args[0];

    // 1. !takimkur [TakımAdı]
    if (komut === '!takimkur') {
        const takimAdi = args[1];
        if (!takimAdi) return message.reply("Lütfen bir takım ismi yaz! Örn: !takimkur Galatasaray");
        
        takimKadro.set(takimAdi, { kurucu: message.author.id, oyuncular: [] });
        message.reply(`✅ **${takimAdi}** başarıyla kuruldu! Kurucusu: ${message.author.username}`);
    }

    // 2. !oyuncuekle [TakımAdı] @Oyuncu
    if (komut === '!oyuncuekle') {
        const takimAdi = args[1];
        const oyuncu = message.mentions.members.first();
        
        if (!takimKadro.has(takimAdi)) return message.reply("❌ Böyle bir takım bulunamadı!");
        if (takimKadro.get(takimAdi).kurucu !== message.author.id) return message.reply("❌ Sadece takımın kurucusu oyuncu ekleyebilir!");
        if (!oyuncu) return message.reply("❌ Lütfen bir kullanıcıyı etiketle!");

        takimKadro.get(takimAdi).oyuncular.push(oyuncu.displayName);
        message.reply(`⚽ ${oyuncu.displayName}, ${takimAdi} kadrosuna eklendi.`);
    }

    // 3. !macbaslat [Ev] [Dep]
    if (komut === '!macbaslat') {
        const ev = args[1];
        const dep = args[2];
        if (!ev || !dep) return message.reply("Örn: !macbaslat Galatasaray Kocaelispor");
        
        // Buraya simülasyon kodun gelecek
        message.channel.send(`🏟️ **Maç Başlıyor!** ${ev} vs ${dep}`);
    }
});

client.login(process.env.TOKEN);
