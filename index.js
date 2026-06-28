    const { Client, GatewayIntentBits, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ]
});

// ==========================================
// SABİT CONFIG VE ID AYARLARI
// ==========================================
const KAYIT_YETKILI_ROLLER = ['1520768910947782687']; 
const TAKIM_YETKILI_ROLLER = ['1519414839561158828']; 
const OYUNCU_YETKILI_ROLLER = ['1520770167720771644', '1520770097558585344'];
const DEGER_YETKILI_ROL = '1520768962193915945'; 

const KAYIT_ODASI_ID = '1520767182563311737'; 
const KAYIT_DUYURU_KANAL_ID = '1520767204746858567'; 
const DEGER_BILDIRI_KANAL_ID = '1520767223646519328'; 

const ROL_FUTBOLCU = '1520770217041727598';
const ROL_TD = '1520770167720771644';
const ROL_BASKAN = '1520770097558585344';

// Hafıza Veritabanları
let takimlar = {}; 
let oyuncuVerileri = {}; 

let antrenmanCooldown = new Map(); 
let penaltiCooldown = new Map();   

const KUFUR_LISTESI = ['amk', 'aq', 'orospu', 'piç', 'sik', 'göt', 'yarrak', '31', 'oe', 'oropusu'];

function veriGarantiEt(id) {
    if (!oyuncuVerileri[id]) {
        oyuncuVerileri[id] = { ant: 0, deger: "Girilmedi", bakiye: 0 };
    }
    if (oyuncuVerileri[id].bakiye === undefined || oyuncuVerileri[id].bakiye === null) {
        oyuncuVerileri[id].bakiye = 0;
    }
    if (!oyuncuVerileri[id].deger) {
        oyuncuVerileri[id].deger = "Girilmedi";
    }
}

client.once('ready', () => {
    console.log(`⚽ Tüm izinler açık! Giriş ve Ekonomi sistemi hazır kanka.`);
});

// KRİTİK: Botun paneli kırmızıya boyayıp kapanmasını engelleyen küresel yakalayıcılar
process.on('unhandledRejection', (reason, p) => { 
    console.error("🔴 [Sistem Hatası Yakalandı]:", reason); 
});
process.on('uncaughtException', (err, origin) => { 
    console.error("🔴 [Kritik Hata Yakalandı]:", err); 
});

// ==========================================
// GÜVENLİKLİ GİRİŞ SİSTEMİ (18194.jpg TASARIMI)
// ==========================================
client.on('guildMemberAdd', async (member) => {
    try {
        const kayitKanali = member.guild.channels.cache.get(KAYIT_ODASI_ID);
        if (!kayitKanali) return console.log("⚠️ Kayıt kanalı sunucuda bulunamadı, ID'yi kontrol et kanka.");

        const uyeSayisi = member.guild.memberCount;
        const olusturmaTarihi = member.user.createdAt;
        const hesapYasiGun = Math.floor((new Date() - olusturmaTarihi) / (1000 * 60 * 60 * 24));
        
        const guvenilirMi = hesapYasiGun >= 30;
        const guvenlikDurumu = guvenilirMi ? '🔹 Güvenilir!' : '⚠️ Güvenilir Değil (Şüpheli)!';

        const girisEmbed = new EmbedBuilder()
            .setAuthor({ name: `Yeni Bir Kullanıcı Katıldı, 👋\n${member.user.username}!`, iconURL: member.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL() })
            .setDescription(`👋 **Sunucumuza hoş geldin** <@${member.id}>\n\n🔹 **Seninle birlikte ${uyeSayisi} kişiyiz.**\n\n\n☀️ **Hesap oluşturulma tarihi:** ${olusturmaTarihi.toLocaleDateString('tr-TR')}  ${olusturmaTarihi.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}\n🦹‍♀️ **Güvenilirlik durumu:**\n☑️ **${guvenlikDurumu}**`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }) || client.user.displayAvatarURL())
            .setColor(0x1F2225)
            .setFooter({ text: 'Nors', iconURL: client.user.displayAvatarURL() });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`btn_kayit_baslat_${member.id}`)
                .setLabel('🪪 Normal Kayıt')
                .setStyle(ButtonStyle.Primary)
        );

        await kayitKanali.send({ 
            content: `📢 <@&1520768910947782687>, <@${member.id}> sunucuya giriş yaptı.`, 
            embeds: [girisEmbed],
            components: [row]
        });
    } catch (e) { 
        console.error("🔴 Giriş mesajı gönderilirken hata oluştu:", e.message); 
    }
});

// ==========================================
// MESAJ MERKEZİ (KOMUTLAR VE KORUMALAR)
// ==========================================
client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot || !message.guild) return;

        const icerik = message.content.trim();
        const icerikKucuk = icerik.toLowerCase();

        // --- GÜVENLİK KORUMASI ---
        const kufurVarMi = KUFUR_LISTESI.some(kufur => new RegExp(`\\b${kufur}\\b`, 'i').test(icerikKucuk));
        if (kufurVarMi && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await message.delete().catch(() => {});
            await message.member.timeout(2 * 60 * 1000, 'Sohbette küfür/argo kullanımı.').catch(() => {});
            return message.channel.send(`⚠️ <@${message.author.id}> küfür ettiği için **2 dakika** susturuldu kanka.`).catch(() => {});
        }

        // --- .yardim KOMUTU ---
        if (icerikKucuk === '.yardim') {
            const embed = new EmbedBuilder()
                .setTitle('📋 Nors Bot Komut Listesi')
                .setColor(0x2F3136)
                .setDescription(
                    `⚽ **Oyuncu Komutları:**\n• **.profil [@üye]**\n• **.ant**\n• **.pen**\n• **.post [Mesaj]**\n\n` +
                    `💰 **Ekonomi Komutları:**\n• **.bakiye [@üye]**\n• **.send @üye [Miktar]**\n• **.paraver @üye [Miktar]**\n• **.paracikar @üye [Miktar]**\n\n` +
                    `📥 **Yönetim & Kayıt:**\n• **-k @üye [İsim]**\n• **.degerver @üye [Miktar]**`
                );
            return message.reply({ embeds: [embed] }).catch(() => {});
        }

        // --- -k SERBEST KAYIT KOMUTU ---
        if (icerikKucuk.startsWith('-k') || icerikKucuk.startsWith('-kayit')) {
            if (message.channel.id !== KAYIT_ODASI_ID) return;

            const yetkiliMi = message.member.roles.cache.some(r => KAYIT_YETKILI_ROLLER.includes(r.id));
            if (!yetkiliMi) return message.reply('❌ Kayıt yetkilisi rolün yok kanka.').catch(() => {});

            const hedefUye = message.mentions.members.first();
            if (!hedefUye) return message.reply('❌ Üyeyi etiketle kanka! Örn: `-k @üye İsim`').catch(() => {});

            const metinKismi = icerik.substring(icerik.indexOf('>') + 1).trim();
            if (!metinKismi) return message.reply('❌ Sunucu ismini yaz kanka!').catch(() => {});

            const kelimeler = metinKismi.split(' ');
            veriGarantiEt(hedefUye.id);
            oyuncuVerileri[hedefUye.id].deger = kelimeler[kelimeler.length - 1];

            await hedefUye.setNickname(metinKismi).catch(() => {});

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`k_futbolcu_${hedefUye.id}`).setLabel('⚽ Futbolcu').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`k_td_${hedefUye.id}`).setLabel('📋 Teknik Direktör').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`k_baskan_${hedefUye.id}`).setLabel('👑 Takım Başkanı').setStyle(ButtonStyle.Success)
            );

            return message.reply({ content: `📝 <@${hedefUye.id}> ismi yazıldı. Rol seç kanka:`, components: [row] }).catch(() => {});
        }

        // --- ECONOMY KOMUTLARI ---
        if (icerikKucuk.startsWith('.bakiye')) {
            const hedefUye = message.mentions.members.first() || message.member;
            veriGarantiEt(hedefUye.id);
            return message.reply(`💰 <@${hedefUye.id}> bakiyesi: **${oyuncuVerileri[hedefUye.id].bakiye.toLocaleString('tr-TR')} ₺**`).catch(() => {});
        }

        if (icerikKucuk.startsWith('.paraver') || icerikKucuk.startsWith('.paraal')) {
            if (!message.member.roles.cache.some(r => TAKIM_YETKILI_ROLLER.includes(r.id))) return message.reply('❌ Ekonomi yetkin yok kanka!').catch(() => {});
            const hedefUye = message.mentions.members.first();
            if (!hedefUye) return message.reply('❌ Örn: `.paraver @üye 10000`').catch(() => {});
            const arg = icerik.split(' ');
            const miktar = parseInt(arg[arg.length - 1]);
            if (isNaN(miktar) || miktar <= 0) return message.reply('❌ Geçersiz miktar.').catch(() => {});

            veriGarantiEt(hedefUye.id);
            oyuncuVerileri[hedefUye.id].bakiye += miktar;
            return message.reply(`💰 <@${hedefUye.id}> hesabına **${miktar.toLocaleString('tr-TR')} ₺** eklendi.`).catch(() => {});
        }

        if (icerikKucuk.startsWith('.paracikar')) {
            if (!message.member.roles.cache.some(r => TAKIM_YETKILI_ROLLER.includes(r.id))) return message.reply('❌ Ekonomi yetkin yok kanka!').catch(() => {});
            const hedefUye = message.mentions.members.first();
            if (!hedefUye) return message.reply('❌ Örn: `.paracikar @üye 5000`').catch(() => {});
            const arg = icerik.split(' ');
            const miktar = parseInt(arg[arg.length - 1]);
            if (isNaN(miktar) || miktar <= 0) return message.reply('❌ Geçersiz miktar.').catch(() => {});

            veriGarantiEt(hedefUye.id);
            oyuncuVerileri[hedefUye.id].bakiye = Math.max(0, oyuncuVerileri[hedefUye.id].bakiye - miktar);
            return message.reply(`📉 <@${hedefUye.id}> hesabından **${miktar.toLocaleString('tr-TR')} ₺** düşüldü.`).catch(() => {});
        }

        if (icerikKucuk.startsWith('.send')) {
            const hedefUye = message.mentions.members.first();
            if (!hedefUye || hedefUye.id === message.author.id) return message.reply('❌ Geçersiz üye.').catch(() => {});
            const arg = icerik.split(' ');
            const miktar = parseInt(arg[arg.length - 1]);
            if (isNaN(miktar) || miktar <= 0) return message.reply('❌ Geçersiz miktar.').catch(() => {});

            veriGarantiEt(message.author.id);
            if (oyuncuVerileri[message.author.id].bakiye < miktar) return message.reply('❌ Paran yetersiz kanka.').catch(() => {});

            veriGarantiEt(hedefUye.id);
            oyuncuVerileri[message.author.id].bakiye -= miktar;
            oyuncuVerileri[hedefUye.id].bakiye += miktar;
            return message.reply(`✅ **${miktar.toLocaleString('tr-TR')} ₺** gönderildi!`).catch(() => {});
        }

        // --- .ant VE .pen KOMUTLARI ---
        if (icerikKucuk === '.ant') {
            const id = message.author.id;
            if (antrenmanCooldown.has(id) && Date.now() - antrenmanCooldown.get(id) < 3600000) return message.reply('⏳ Saatte bir antrenman yapabilirsin.').catch(() => {});
            veriGarantiEt(id);
            if (oyuncuVerileri[id].ant < 5) oyuncuVerileri[id].ant += 1;
            antrenmanCooldown.set(id, Date.now());
            return message.reply(`🏃‍♂️ Antrenman yapıldı. Durum: \`${oyuncuVerileri[id].ant}/5\``).catch(() => {});
        }

        if (icerikKucuk === '.pen') {
            const id = message.author.id;
            if (penaltiCooldown.has(id) && Date.now() - penaltiCooldown.get(id) < 3600000) return message.reply('⏳ Saatte bir penaltı atabilirsin.').catch(() => {});
            penaltiCooldown.set(id, Date.now());
            const res = ['⚽ GOL!', '🧤 KALECİ KURTARDI!', '💥 DİREK!'][Math.floor(Math.random() * 3)];
            return message.reply(`🥅 Şut çekildi... Sonuç: **${res}**`).catch(() => {});
        }

        // --- .profil ---
        if (icerikKucuk.startsWith('.profil')) {
            const hedefUye = message.mentions.members.first() || message.member;
            veriGarantiEt(hedefUye.id);
            const embed = new EmbedBuilder()
                .setTitle(`👤 ${hedefUye.user.username} Profili`)
                .setColor(0x2F3136)
                .addFields(
                    { name: '🎽 Antrenman', value: `\`${oyuncuVerileri[hedefUye.id].ant}/5\``, inline: true },
                    { name: '💰 Değer', value: `\`${oyuncuVerileri[hedefUye.id].deger}\``, inline: true },
                    { name: '💵 Cüzdan', value: `\`${oyuncuVerileri[hedefUye.id].bakiye.toLocaleString('tr-TR')} ₺\``, inline: false }
                );
            return message.reply({ embeds: [embed] }).catch(() => {});
        }

    } catch (err) { console.error("Mesaj hatası:", err.message); }
});

// ==========================================
// BUTON ETKİLEŞİM MERKEZİ (ÇÖKMEYE KARŞI KORUMALI)
// ==========================================
client.on('interactionCreate', async (interaction) => {
    try {
        if (!interaction.isButton()) return;

        // --- 1. GÖRSELDEKİ "NORMAL KAYIT" BUTONU ---
        if (interaction.customId.startsWith('btn_kayit_baslat_')) {
            const yetkiliMi = interaction.member.roles.cache.some(r => KAYIT_YETKILI_ROLLER.includes(r.id));
            if (!yetkiliMi) {
                return interaction.reply({ content: '❌ Bu butona basmak için Kayıt Yetkilisi olmalısın kanka!', ephemeral: true }).catch(() => {});
            }
            const hedefUyeId = interaction.customId.replace('btn_kayit_baslat_', '');
            return interaction.reply({ 
                content: `🚀 Kayıt tetiklendi! Kanala direkt \`-k <@${hedefUyeId}> İsim Değer\` yazarak kaydı tamamla kanka.`, 
                ephemeral: true 
            }).catch(() => {});
        }

        // --- 2. -k KOMUTU ROL BUTONLARI ---
        const [prefix, rolTipi, deleteId] = interaction.customId.split('_');
        if (prefix !== 'k') return;

        const hedefUye = await interaction.guild.members.fetch(deleteId).catch(() => null);
        if (!hedefUye) return interaction.reply({ content: '❌ Kullanıcı sunucudan çıkmış kanka.', ephemeral: true }).catch(() => {});

        let rolId = ''; let rolIsmi = '';
        if (rolTipi === 'futbolcu') { rolId = ROL_FUTBOLCU; rolIsmi = 'Futbolcu'; }
        else if (rolTipi === 'td') { rolId = ROL_TD; rolIsmi = 'Teknik Direktör'; }
        else if (rolTipi === 'baskan') { rolId = ROL_BASKAN; rolIsmi = 'Takım Başkanı'; }

        await hedefUye.roles.add(rolId).catch(() => {});
        await interaction.message.delete().catch(() => {});

        const duyuruKanali = interaction.guild.channels.cache.get(KAYIT_DUYURU_KANAL_ID);
        if (duyuruKanali) {
            const embed = new EmbedBuilder()
                .setTitle('✨ Kayıt Yapıldı!')
                .setDescription(`🤝 • <@${hedefUye.id}> aramıza **${rolIsmi}** rolleriyle katıldı.\n\n🌟 • **Yetkili:** <@${interaction.user.id}>\n\n🐼 • **Hoş geldin** <@${hedefUye.id}>`)
                .setColor(0x2F3136);
            await duyuruKanali.send({ embeds: [embed] }).catch(() => {});
        }
        return interaction.reply({ content: `✅ Rol başarıyla verildi kanka.`, ephemeral: true }).catch(() => {});
    } catch (err) { 
        console.error("🔴 Buton hatası yakalandı:", err.message); 
    }
});

// Kendi bot tokenını buraya girmeyi unutma kanka!
client.login(process.env.TOKEN);
                
