const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = ".";

// --- ID TANIMLAMALARI ---
const KAYITLI_ROL_ID = "1521842733462061227";      // Kayıt edilince verilecek rol
const KAYITSIZ_ROL_ID = "1521842738838896781";     // Sunucuya girene otomatik verilecek / Kayıt olunca silinecek rol
const YETKILI_ROL_ID = "1521842728202141718";      // .k komutunu kullanabilecek yetkili rolü

const GIRIS_LOG_KANAL_ID = "1521844270473154571";  // Biri girince "Kayıt et" mesajı atılacak kanal
const KAYIT_LOG_KANAL_ID = "1521842778240188528";  // Kayıt işlemi başarılı olunca mesaj atılacak kanal

client.once('ready', () => {
    console.log(`[BOT] ${client.user.tag} başarıyla aktif edildi!`);
});

// --- OTO ROL (SUNUCUYA BİRİ GİRİNCE) ---
client.on('guildMemberAdd', async (member) => {
    try {
        // Kayıtsız rolünü otomatik ver
        await member.roles.add(KAYITSIZ_ROL_ID);
        
        // Giriş log kanalına şık mesaj gönder
        const girisKanal = member.guild.channels.cache.get(GIRIS_LOG_KANAL_ID);
        if (girisKanal) {
            const girisEmbed = new EmbedBuilder()
                .setColor('#2F3136')
                .setTitle('📥 Yeni Üye Katıldı')
                .setDescription(`Hoş geldin ${member}! Sunucuya otomatik olarak <@&${KAYITSIZ_ROL_ID}> rolü verildi.\n\nYetkililer sizinle ilgilenecektir.`)
                .setTimestamp();
            
            girisKanal.send({ content: `<@&${YETKILI_ROL_ID}> kayıt et!`, embeds: [girisEmbed] });
        }
    } catch (error) {
        console.error("Oto rol verirken veya log atarken hata oluştu:", error);
    }
});

// --- KAYIT KOMUTU (.k @üye isim) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'k') {
        // 1. Yetkili Kontrolü
        if (!message.member.roles.cache.has(YETKILI_ROL_ID)) {
            return message.reply("❌ Bu komutu kullanmak için gerekli yetkiye sahip değilsin!");
        }

        // 2. Üye ve İsim Kontrolü
        const hedefUye = message.mentions.members.first();
        const yeniIsim = args.slice(1).join(" "); // Etiketlenen üyeden sonra yazılan her şeyi isim kabul eder

        if (!hedefUye || !yeniIsim) {
            return message.reply(`❌ **Hatalı Kullanım!**\nFormat: \`.k @üye yeni_isim\``);
        }

        try {
            // 3. İsmini Değiştir
            await hedefUye.setNickname(yeniIsim);

            // 4. Rolleri Düzenle (Kayıtlı ver, Kayıtsız sil)
            await hedefUye.roles.add(KAYITLI_ROL_ID);
            if (hedefUye.roles.cache.has(KAYITSIZ_ROL_ID)) {
                await hedefUye.roles.remove(KAYITSIZ_ROL_ID);
            }

            // 5. Kayıt Başarılı Mesajı (Mevcut Kanala)
            const basariliEmbed = new EmbedBuilder()
                .setColor('#2F3136')
                .setTitle('✅ Kayıt İşlemi Başarılı')
                .setDescription(`${hedefUye} kullanıcısı başarıyla kayıt edildi!`)
                .addFields(
                    { name: '📝 Yeni İsim', value: `\`${yeniIsim}\``, inline: true },
                    { name: '👤 Kayıt Eden Yetkili', value: `${message.author}`, inline: true }
                )
                .setTimestamp();

            await message.reply({ embeds: [basariliEmbed] });

            // 6. Kayıt Log Kanalına Bilgi Gönder
            const kayitLogKanal = message.guild.channels.cache.get(KAYIT_LOG_KANAL_ID);
            if (kayitLogKanal) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#2F3136')
                    .setTitle('🗂️ Kayıt Günlüğü')
                    .setDescription(`${hedefUye} üyesi, ${message.author} tarafından kayıt edildi ve rolleri güncellendi.`)
                    .setTimestamp();
                
                kayitLogKanal.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error("Kayıt işlemi sırasında hata oluştu:", error);
            return message.reply("❌ Rolleri değiştirirken veya ismi güncellerken bir hata oluştu! Botun rolünün kayıt edilecek rollerin **üstünde** olduğundan emin olun.");
        }
    }
});

// BURAYA: Tırnak işaretlerinin içine Discord Developer Portal'dan aldığın gizli bot tokenini yapıştır!
client.login("MTUyMDg3MzczNzA4NjMwNDQ2Ng.GQS9Gz.81eYne9yrRsQ-KRx58LHgZFClF6IMtPgdyujdw");
