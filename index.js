        const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const KAYIT_ROL_ID = '1519436749661671454';
const takimlar = new Map();

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const args = message.content.split(' ');
    const komut = args[0];

    // 1. TAKIM KURMA
    if (komut === '!takimkur') {
        if (!message.member.roles.cache.has(KAYIT_ROL_ID)) return message.reply("❌ Takım kurmak için <@&1519436749661671454> rolüne sahip olmalısın!");
        const isim = args[1];
        if (!isim) return message.reply("Takım ismi gir! Örn: !takimkur Gs");
        takimlar.set(isim, { baskan: message.author.id, kadro: [] });
        message.reply(`✅ **${isim}** kuruldu! Başkan: <@${message.author.id}>`);
    }

    // 2. OYUNCU EKLEME
    if (komut === '!oyuncuekle') {
        const isim = args[1];
        const oyuncu = message.mentions.members.first();
        if (!takimlar.has(isim)) return message.reply("❌ Takım bulunamadı!");
        if (takimlar.get(isim).baskan !== message.author.id) return message.reply("❌ Sadece başkan ekleyebilir!");
        if (!oyuncu) return message.reply("❌ Kullanıcı etiketle!");
        takimlar.get(isim).kadro.push(oyuncu.displayName);
        message.reply(`⚽ ${oyuncu.displayName} kadroya eklendi.`);
    }

    // 3. KADRO GÖRÜNTÜLEME
    if (komut === '!kadro') {
        const isim = args[1];
        if (!takimlar.has(isim)) return message.reply("❌ Takım bulunamadı!");
        const data = takimlar.get(isim);
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`📋 ${isim} Kadrosu`)
            .addFields(
                { name: '👤 Başkan', value: `<@${data.baskan}>` },
                { name: '👥 Oyuncular', value: data.kadro.length > 0 ? data.kadro.join('\n') : "Henüz yok." }
            );
        message.channel.send({ embeds: [embed] });
    }

    // 4. TAKIM LİSTELEME
    if (komut === '!takimliste') {
        if (takimlar.size === 0) return message.reply("Hiç takım yok.");
        let txt = "**🏆 Kayıtlı Takımlar:**\n";
        takimlar.forEach((d, k) => txt += `• **${k}** | Başkan: <@${d.baskan}>\n`);
        message.channel.send(txt);
    }

    // 5. MAÇ BAŞLATMA
    if (komut === '!macbaslat') {
        const ev = args[1], dep = args[3];
        if (!takimlar.has(ev) || !takimlar.has(dep)) return message.reply("❌ Takımlar hatalı!");
        if (takimlar.get(ev).baskan !== message.author.id) return message.reply("❌ Sadece başkan başlatabilir!");

        let d = 0, evG = 0, depG = 0;
        const msg = await message.channel.send(`🏟️ **MAÇ BAŞLADI:** ${ev} - ${dep}`);

        const mac = setInterval(async () => {
            d++;
            let durum = "Mücadele sürüyor...";
            if (Math.random() < 0.05) {
                if (Math.random() > 0.5) evG++; else depG++;
                durum = "⚽ GOL!";
            }
            const emb = new EmbedBuilder().setColor(0x00FF00).setTitle(`Dakika ${d}'`).setDescription(`Skor: ${evG} - ${depG}\n📝 ${durum}`);
            await msg.edit({ content: " ", embeds: [emb] });
            if (d >= 90) {
                clearInterval(mac);
                msg.edit(`🏁 **MAÇ SONUCU:** ${ev} ${evG} - ${depG} ${dep}`);
            }
        }, 60000);
    }
});

client.login(process.env.TOKEN);
