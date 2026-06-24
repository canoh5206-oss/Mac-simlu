const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const takimlar = new Map();

client.on('messageCreate', async (message) => {
    const args = message.content.split(' ');
    const komut = args[0];

    // 1. TAKIM KURMA
    if (komut === '!takimkur') {
        const isim = args[1];
        if (!isim) return message.reply("İsim gir! Örn: !takimkur Gs");
        takimlar.set(isim, { kurucu: message.author.id, kadro: [] });
        message.reply(`✅ **${isim}** kuruldu! Kurucusu: ${message.author.username}`);
    }

    // 2. OYUNCU EKLEME
    if (komut === '!oyuncuekle') {
        const isim = args[1];
        const oyuncu = message.mentions.members.first();
        if (!takimlar.has(isim)) return message.reply("❌ Takım yok!");
        if (takimlar.get(isim).kurucu !== message.author.id) return message.reply("❌ Sadece kurucu ekleyebilir!");
        if (!oyuncu) return message.reply("❌ Oyuncu etiketle!");

        takimlar.get(isim).kadro.push(oyuncu.displayName);
        message.reply(`⚽ ${oyuncu.displayName} eklendi.`);
    }

    // 3. LİSTELEME
    if (komut === '!takimliste') {
        let text = "**Kayıtlı Takımlar:**\n";
        takimlar.forEach((v, k) => text += `• **${k}**: ${v.kadro.join(', ')}\n`);
        message.channel.send(text || "Takım yok.");
    }

    // 4. MAÇ BAŞLATMA (90 DK, 1DK=60SN)
    if (komut === '!macbaslat') {
        const ev = args[1], dep = args[3];
        if (!takimlar.has(ev) || !takimlar.has(dep)) return message.reply("❌ Takımlar kayıtlı değil!");
        if (takimlar.get(ev).kurucu !== message.author.id) return message.reply("❌ Sadece kurucusu başlatabilir!");

        let d = 0, evG = 0, depG = 0;
        const msg = await message.channel.send(`🏟️ **MAÇ BAŞLADI:** ${ev} vs ${dep}`);

        const mac = setInterval(async () => {
            d++;
            let durum = "Mücadele sürüyor...";
            if (Math.random() < 0.05) {
                if (Math.random() > 0.5) evG++; else depG++;
                durum = "⚽ GOL OLDU!";
            }
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle(`Dakika ${d}'`)
                .setDescription(`Skor: ${ev} ${evG} - ${depG} ${dep}\n📝 ${durum}`);
            
            await msg.edit({ content: " ", embeds: [embed] });

            if (d >= 90) {
                clearInterval(mac);
                msg.edit(`🏁 **BİTTİ:** ${ev} ${evG} - ${depG} ${dep}`);
            }
        }, 60000); // 60000 = 60 saniye
    }
});

client.login(process.env.TOKEN);
