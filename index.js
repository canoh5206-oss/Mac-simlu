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
        if (!isim) return message.reply("Kullanım: !takimkur Fenerbahçe");
        takimlar.set(isim, { baskan: message.author.id, kadro: [] });
        message.reply(`✅ **${isim}** kuruldu!`);
    }

    // 2. TAKIM LİSTELEME
    if (komut === '!takimliste') {
        if (takimlar.size === 0) return message.reply("Hiç takım kurulmamış.");
        let txt = "**🏆 Kayıtlı Takımlar:**\n";
        takimlar.forEach((v, k) => txt += `• **${k}** | Başkan: <@${v.baskan}>\n`);
        message.channel.send(txt);
    }

    // 3. OYUNCU EKLEME: !oyuncuekle @kullanıcı Forvet Fenerbahçe
    // args[0]=!oyuncuekle, args[1]=@kullanıcı, args[2]=Mevki, args[3]=Takım
    if (komut === '!oyuncuekle') {
        const oyuncu = message.mentions.members.first();
        const mevki = args[2];
        const takimAdi = args[3];
        
        if (!takimAdi || !takimlar.has(takimAdi)) {
            return message.reply(`❌ **${takimAdi}** adında takım yok! Lütfen !takimliste ile isimleri kontrol et.`);
        }
        if (takimlar.get(takimAdi).baskan !== message.author.id) {
            return message.reply("❌ Sadece başkan ekleyebilir!");
        }
        
        takimlar.get(takimAdi).kadro.push({ ad: oyuncu.displayName, mevki: mevki });
        message.reply(`⚽ ${oyuncu.displayName} (${mevki}) ${takimAdi} kadrosuna eklendi.`);
    }

    // 4. KADRO
    if (komut === '!kadro') {
        const isim = args[1];
        if (!takimlar.has(isim)) return message.reply("❌ Takım yok!");
        const data = takimlar.get(isim);
        const kadroText = data.kadro.map(o => `• **${o.ad}** (${o.mevki})`).join('\n') || "Yok.";
        const embed = new EmbedBuilder().setTitle(`📋 ${isim} Kadrosu`).setDescription(`Başkan: <@${data.baskan}>\n\n**Oyuncular:**\n${kadroText}`);
        message.channel.send({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);
