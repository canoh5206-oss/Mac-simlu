const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const takimlar = new Map(); // Takım verileri burada

client.on('messageCreate', async (message) => {
    const args = message.content.split(' ');
    const komut = args[0];

    // 1. TAKIM KURMA
    if (komut === '!takimkur') {
        const isim = args[1];
        if (!isim) return message.reply("Takım ismi yazmalısın! Örn: !takimkur Galatasaray");
        
        takimlar.set(isim, { kurucu: message.author.id, oyuncular: [] });
        message.reply(`✅ **${isim}** kuruldu! Artık !oyuncuekle ${isim} @oyuncu yapabilirsin.`);
    }

    // 2. OYUNCU EKLEME
    if (komut === '!oyuncuekle') {
        const isim = args[1];
        const oyuncu = message.mentions.members.first();
        
        if (!isim || !takimlar.has(isim)) return message.reply("❌ Önce !takimkur [isim] yaparak takımı oluşturmalısın.");
        if (takimlar.get(isim).kurucu !== message.author.id) return message.reply("❌ Sadece kurucusu oyuncu ekleyebilir!");
        if (!oyuncu) return message.reply("❌ Oyuncu etiketlemelisin!");

        takimlar.get(isim).oyuncular.push(oyuncu.displayName);
        message.reply(`⚽ ${oyuncu.displayName}, ${isim} kadrosuna eklendi.`);
    }

    // 3. MAÇ BAŞLATMA (Sadece Kurucu)
    if (komut === '!macbaslat') {
        const ev = args[1];
        const dep = args[2];

        if (!ev || !dep) return message.reply("Örn: !macbaslat Galatasaray Fenerbahçe");
        if (!takimlar.has(ev)) return message.reply(`❌ ${ev} takımı sistemde kayıtlı değil! Önce !takimkur ${ev} yap.`);
        if (takimlar.get(ev).kurucu !== message.author.id) return message.reply("❌ Bu maçı sadece takımı kuran kişi başlatabilir!");

        message.channel.send(`🏟️ **Reality League Başlıyor!**\n${ev} vs ${dep}\nMaç simülasyonu başlatılıyor...`);
    }
});

client.login(process.env.TOKEN);
