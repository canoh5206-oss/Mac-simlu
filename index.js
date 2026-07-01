   const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Kayıt Sistemi Aktif!'));
app.listen(port, '0.0.0.0', () => console.log(`Web sunucusu ${port} portunda hazır.`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,    // Sunucuya girenleri yakalamak için şart!
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// AYARLAR (Rol ve Kanal ID'lerin)
const CONFIG = {
    token: "DISCORD_DAN_ALDIĞIN_BOT_TOKENINI_BURAYA_YAZ",
    sunucuId: "1511859511634301059",
    yetkiliRolId: "1521842728202141718",      // Kayıt yapabilen yetkili rolü
    kayitliRolId: "1521842733462061227",      // Kayıt edilince verilecek rol
    kayitsizRolId: "1521842738838896781",    // Sunucuya girince otomatik verilecek ve kayıtta silinecek rol
    girisLogKanalId: "1521844270473154571",   // Biri girdiğinde mesaj atılacak kanal
    kayitLogKanalId: "1521842778240188528"    // Kayıt tamamlandığında mesaj atılacak kanal
};

client.on('ready', () => {
    console.log(`✅ ${client.user.tag} kayıt sistemi başarıyla aktif edildi!`);
});

// 1. OTOMATİK ROL VE GİRİŞ LOG SİSTEMİ
client.on('guildMemberAdd', async (member) => {
    if (member.guild.id !== CONFIG.sunucuId) return;

    try {
        // Sunucuya giren kişiye otomatik olarak kayıtsız rolünü verir
        await member.roles.add(CONFIG.kayitsizRolId);
        
        // Giriş log kanalına bilgilendirme mesajı gönderir
        const logKanal = member.guild.channels.cache.get(CONFIG.girisLogKanalId);
        if (logKanal) {
            const embed = new EmbedBuilder()
                .setTitle("📥 Sunucuya Yeni Biri Katıldı!")
                .setDescription(`Hoş geldin ${member}! Seninle birlikte sunucumuz daha da büyüdü.\n\nKayıt olmak için yetkilileri bekleyebilir veya adımları takip edebilirsin.`)
                .setColor("Green")
                .setTimestamp();
            logKanal.send({ content: `${member}`, embeds: [embed] });
        }
    } catch (error) {
        console.error("Giriş işleminde hata oluştu:", error);
    }
});

// 2. .k İSİM KAYIT SİSTEMİ
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild || message.guild.id !== CONFIG.sunucuId) return;

    // .k komutunu kontrol et
    if (message.content.startsWith('.k ')) {
        // Komutu kullanan kişi kayıt yetkilisi mi?
        if (!message.member.roles.cache.has(CONFIG.yetkiliRolId)) {
            return message.reply("⚠️ Bu komutu kullanmak için gerekli kayıt yetkisine sahip değilsin!");
        }

        // Mesajı parçala: .k @etiket İsim
        const args = message.content.slice(3).trim().split(' ');
        const hedefUye = message.mentions.members.first();

        if (!hedefUye) {
            return message.reply("⚠️ Kullanımı hatalı yaptın! Örnek: `.k @kullanıcı İsim` şeklinde yazmalısın.");
        }

        // Etiket haricindeki tüm yazıyı isim olarak birleştir (İstediği ismi yapabilmesi için)
        const yeniIsim = args.slice(1).join(' ').replace(/<@!?\d+>/g, '').trim();

        if (!yeniIsim) {
            return message.reply("⚠️ Lütfen üyenin sunucudaki yeni ismini de yaz.");
        }

        try {
            // Üyenin adını değiştirir
            await hedefUye.setNickname(yeniIsim);

            // Kayıtlı rolünü verir, kayıtsız rolünü siler
            await hedefUye.roles.add(CONFIG.kayitliRolId);
            await hedefUye.roles.remove(CONFIG.kayitsizRolId);

            // Yetkiliye başarı mesajı atar
            message.reply(`✅ ${hedefUye} kişisi başarıyla \`${yeniIsim}\` ismiyle kayıt edildi!`);

            // Kayıt log kanalına bilgilendirme gönderir
            const kayitLogKanal = message.guild.channels.cache.get(CONFIG.kayitLogKanalId);
            if (kayitLogKanal) {
                const embed = new EmbedBuilder()
                    .setTitle("🎉 Bir Üye Kayıt Edildi!")
                    .addFields(
                        { name: "🏃 Kayıt Edilen:", value: `${hedefUye} (\`${hedefUye.id}\`)`, inline: true },
                        { name: "🛡️ Kayıt Eden Yetkili:", value: `${message.author}`, inline: true },
                        { name: "📝 Yeni İsim:", value: `\`${yeniIsim}\``, inline: false }
                    )
                    .setColor("Blurple")
                    .setTimestamp();
                kayitLogKanal.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error("Kayıt esnasında bir hata meydana geldi:", error);
            message.reply("❌ Botun yetkisi üyenin ismini veya rolünü değiştirmeye yetmiyor! Lütfen botun rolünü Discord ayarlarında en üste taşı.");
        }
    }
});

// Discord Bot Token Girişi
client.login(CONFIG.token);

