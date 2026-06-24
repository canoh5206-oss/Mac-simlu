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
        if (!message.member.roles.cache.has(KAYIT_ROL_ID)) return message.reply("❌ Yetkin yok!");
        const isim = args[1];
        if (!isim) return message.reply("!takimkur [İsim]");
        takimlar.set(isim, { baskan: message.author.id, kadro: [] });
        message.reply(`✅ **${isim}** kuruldu!`);
    }

    // 2. OYUNCU EKLEME
    if (komut === '!oyuncuekle') {
        const oyuncu = message.mentions.members.first();
        const mevki = args[2];
        const takimAdi = args[3]; // Örn: !oyuncuekle @kullanıcı Forvet Fenerbahçe

        // Debug için bunu ekledim, botun ne anladığını göreceğiz
        console.log("Aranan Takım:", takimAdi);
        console.log("Kayıtlı Takımlar:", Array.from(takimlar.keys()));

        if (!takimAdi || !takimlar.has(takimAdi)) {
            return message.reply(`❌ **${takimAdi}** adında bir takım bulamadım! Mevcut takımlar: ${Array.from(takimlar.keys()).join(', ')}`);
        }
        
        if (takimlar.get(takimAdi).baskan !== message.author.id) {
            return message.reply("❌ Sadece başkan ekleyebilir!");
        }
        
        takimlar.get(takimAdi).kadro.push({ ad: oyuncu.displayName, mevki: mevki });
        message.reply(`⚽ ${oyuncu.displayName} (${mevki}) ${takimAdi} kadrosuna eklendi.`);
    }


    // 3. KADRO GÖRÜNTÜLEME
    if (komut === '!kadro') {
        const isim = args[1];
        if (!takimlar.has(isim)) return message.reply("❌ Takım yok!");
        const data = takimlar.get(isim);
        
        const kadroText = data.kadro.length > 0 
            ? data.kadro.map(o => `• **${o.ad}** - ${o.mevki}`).join('\n') 
            : "Henüz oyuncu yok.";

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`📋 ${isim} Kadrosu`)
            .addFields(
                { name: '👤 Başkan', value: `<@${data.baskan}>` },
                { name: '👥 Oyuncular', value: kadroText }
            );
        message.channel.send({ embeds: [embed] });
    }

    // 4. MAÇ BAŞLATMA (Golcü seçiminde mevki kontrolü)
    if (komut === '!macbaslat') {
        const ev = args[1], dep = args[3];
        if (!takimlar.has(ev) || !takimlar.has(dep)) return message.reply("❌ Takımlar hatalı!");
        
        let d = 0, evG = 0, depG = 0;
        const msg = await message.channel.send(`🏟️ **MAÇ BAŞLADI:** ${ev} vs ${dep}`);

        const mac = setInterval(async () => {
            d++;
            if (Math.random() < 0.08) {
                let atanTakim = Math.random() > 0.5 ? ev : dep;
                let kadro = takimlar.get(atanTakim).kadro;
                let oyuncu = kadro.length > 0 ? kadro[Math.floor(Math.random() * kadro.length)] : { ad: "Oyuncu", mevki: "Normal" };
                
                if (atanTakim === ev) evG++; else depG++;
                const emb = new EmbedBuilder().setTitle(`⚽ Dk ${d}' GOL!`).setDescription(`**${oyuncu.ad}** (${oyuncu.mevki}) skoru değiştirdi!`);
                await msg.edit({ content: " ", embeds: [emb] });
            }
            if (d >= 90) { clearInterval(mac); msg.edit(`🏁 **SONUÇ:** ${ev} ${evG} - ${depG} ${dep}`); }
        }, 60000);
    }
});

client.login(process.env.TOKEN);
