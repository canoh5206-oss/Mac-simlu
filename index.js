        const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const KAYIT_ROL_ID = '1519436749661671454';
const takimlar = new Map();

client.on('messageCreate', async (message) => {
    const args = message.content.split(' ');
    const komut = args[0];

    // 1. TAKIM KURMA (Kayıt rolü kontrolü)
    if (komut === '!takimkur') {
        if (!message.member.roles.cache.has(KAYIT_ROL_ID)) return message.reply("❌ Takım kurmak için <@&1519436749661671454> rolüne sahip olmalısın!");
        
        const isim = args[1];
        if (!isim) return message.reply("Lütfen bir takım ismi yaz! Örn: !takimkur Galatasaray");
        
        takimlar.set(isim, { baskan: message.author.id, kadro: [] });
        message.reply(`✅ **${isim}** kuruldu! Başkan: <@${message.author.id}>`);
    }

    // 2. TAKIM LİSTELEME (Başkanları etiketleyerek)
    if (komut === '!takimliste') {
        if (takimlar.size === 0) return message.reply("Henüz hiç takım kurulmamış!");
        
        let liste = "**🏆 Kayıtlı Takımlar ve Başkanlar:**\n";
        takimlar.forEach((data, isim) => {
            liste += `• **${isim}** | Başkan: <@${data.baskan}>\n`;
        });
        message.channel.send(liste);
    }

    // 3. OYUNCU EKLEME (Sadece başkan)
    if (komut === '!oyuncuekle') {
        const isim = args[1];
        const oyuncu = message.mentions.members.first();
        if (!takimlar.has(isim)) return message.reply("❌ Takım bulunamadı!");
        if (takimlar.get(isim).baskan !== message.author.id) return message.reply("❌ Sadece takım başkanı oyuncu ekleyebilir!");
        
        takimlar.get(isim).kadro.push(oyuncu.displayName);
        message.reply(`⚽ ${oyuncu.displayName}, ${isim} kadrosuna eklendi.`);
    }

    // 4. MAÇ BAŞLATMA
    if (komut === '!macbaslat') {
        const ev = args[1], dep = args[3];
        if (!takimlar.has(ev) || !takimlar.has(dep)) return message.reply("❌ Takımlar kayıtlı değil!");
        if (takimlar.get(ev).baskan !== message.author.id) return message.reply("❌ Sadece başkan maçı başlatabilir!");

        // ... (Maç döngüsü kodun aynı)
        message.channel.send(`🏟️ ${ev} vs ${dep} maçı başlatılıyor...`);
    }
});

client.login(process.env.TOKEN);
