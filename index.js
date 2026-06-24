const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// TAKIMLARIN SİLİNMEMESİ İÇİN EN TEPEYE KOYDUK
const takimlar = new Map(); 
const KAYIT_ROL_ID = '1519436749661671454';

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const args = message.content.split(' ');
    const komut = args[0];

    // TAKIM KURMA
    if (komut === '!takimkur') {
        if (!message.member.roles.cache.has(KAYIT_ROL_ID)) return message.reply("❌ Yetkin yok!");
        const isim = args[1];
        if (!isim) return message.reply("İsim gir!");
        
        takimlar.set(isim, { baskan: message.author.id, kadro: [] });
        message.reply(`✅ **${isim}** kuruldu! Başkan: <@${message.author.id}>`);
        console.log("Şu an kayıtlı takımlar:", Array.from(takimlar.keys()));
    }

    // TAKIM LİSTELEME
    if (komut === '!takimliste') {
        if (takimlar.size === 0) return message.reply("Hiç takım yok. Önce !takimkur [İsim] yap.");
        let txt = "**🏆 Kayıtlı Takımlar:**\n";
        takimlar.forEach((v, k) => txt += `• **${k}** | Başkan: <@${v.baskan}>\n`);
        message.channel.send(txt);
    }

    // OYUNCU EKLEME
    if (komut === '!oyuncuekle') {
        const takimAdi = args[1];
        const mevki = args[2];
        const oyuncu = message.mentions.members.first();

        // KONTROL EDELİM
        if (!takimlar.has(takimAdi)) {
            return message.reply(`❌ '${takimAdi}' isminde bir takım bulamadım! Kayıtlı takımlar: ${Array.from(takimlar.keys()).join(', ')}`);
        }
        
        if (takimlar.get(takimAdi).baskan !== message.author.id) return message.reply("❌ Sadece başkan ekleyebilir!");
        if (!oyuncu) return message.reply("❌ Oyuncu etiketle!");

        takimlar.get(takimAdi).kadro.push({ ad: oyuncu.displayName, mevki: mevki });
        message.reply(`⚽ ${oyuncu.displayName} (${mevki}) ${takimAdi} kadrosuna eklendi.`);
    }

    // KADRO
    if (komut === '!kadro') {
        const isim = args[1];
        if (!takimlar.has(isim)) return message.reply("❌ Takım yok!");
        const data = takimlar.get(isim);
        const kadroText = data.kadro.map(o => `• **${o.ad}** (${o.mevki})`).join('\n') || "Yok.";
        const embed = new EmbedBuilder().setTitle(`📋 ${isim} Kadrosu`).setDescription(`Başkan: <@${data.baskan}>\n\n${kadroText}`);
        message.channel.send({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);
