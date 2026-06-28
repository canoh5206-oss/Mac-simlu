    const { Client, GatewayIntentBits, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers
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
    if (oyuncuVerileri[id].bakiye === undefined) {
        oyuncuVerileri[id].bakiye = 0;
    }
}

client.once('ready', () => {
    console.log(`⚽ Görseldeki Giriş Tasarımı ve Ekonomi Sistemi Aktif Kanka!`);
});

process.on('unhandledRejection', (reason, p) => { console.error(reason); });
process.on('uncaughtException', (err, origin) => { console.error(err); });

// ==========================================
// GÜVENLİKLİ GİRİŞ SİSTEMİ (18194.jpg TASARIMI)
// ==========================================
client.on('guildMemberAdd', async (member) => {
    const kayitKanali = member.guild.channels.cache.get(KAYIT_ODASI_ID);
    if (!kayitKanali) return;

    const uyeSayisi = member.guild.memberCount;
    const olusturmaTarihi = member.user.createdAt;
    const simdi = new Date();
    const hesapYasiGun = Math.floor((simdi - olusturmaTarihi) / (1000 * 60 * 60 * 24));
    
    const guvenilirMi = hesapYasiGun >= 30;
    const guvenlikDurumu = guvenilirMi ? '🔹 Güvenilir!' : '⚠️ Güvenilir Değil (Şüpheli)!';

    // Görseldeki şık embed yapısı
    const girisEmbed = new EmbedBuilder()
        .setAuthor({ name: `Yeni Bir Kullanıcı Katıldı, 👋\n${member.user.username}!`, iconURL: member.guild.iconURL({ dynamic: true }) })
        .setDescription(`👋 **Sunucumuza hoş geldin** <@${member.id}>\n\n🔹 **Seninle birlikte ${uyeSayisi} kişiyiz.**\n\n\n☀️ **Hesap oluşturulma tarihi:** ${olusturmaTarihi.toLocaleDateString('tr-TR')}  ${olusturmaTarihi.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}\n🦹‍♀️ **Güvenilirlik durumu:**\n☑️ **${guvenlikDurumu}**`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setColor(0x1F2225)
        .setFooter({ text: 'Nors', iconURL: client.user.displayAvatarURL() });

    // "Normal Kayıt" Butonu
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`btn_kayit_baslat_${member.id}`)
            .setLabel('🪪 Normal Kayıt')
            .setStyle(ButtonStyle.Primary)
    );

    // Dışarıdaki etiket yazısı tam görseldeki gibi
    kayitKanali.send({ 
        content: `📢 <@&1520768910947782687>, <@${member.id}> sunucuya giriş yaptı.`, 
        embeds: [girisEmbed],
        components: [row]
    }).catch(() => {});
});

// ==========================================
// MESAJ MERKEZİ (KOMUTLAR VE KORUMALAR)
// ==========================================
client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot || !message.guild) return;

        const icerik = message.content.trim();
        const icerikKucuk = icerik.toLowerCase();

        // --- GÜVENLİK KORUMASI (MUTE 2 DAKİKA) ---
        const kufurVarMi = KUFUR_LISTESI.some(kufur => new RegExp(`\\b${kufur}\\b`, 'i').test(icerikKucuk));
        if (kufurVarMi && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await message.delete().catch(() => {});
            await message.member.timeout(2 * 60 * 1000, 'Sohbette küfür/argo kullanımı.').catch(() => {});
            return message.channel.send(`⚠️ <@${message.author.id}> küfür ettiği için **2 dakika** susturuldu kanka.`);
        }

        // --- .yardim KOMUTU ---
        if (icerikKucuk === '.yardim') {
            const embed = new EmbedBuilder()
                .setTitle('📋 Nors Bot Komut Listesi')
                .setColor(0x2F3136)
                .setThumbnail(client.user.displayAvatarURL())
                .setDescription(
                    `⚽ **Oyuncu Komutları:**\n` +
                    `• **.profil [@üye]** - Bilgilerini ve cüzdanını gösterir.\n` +
                    `• **.ant** - Saatlik sıralı antrenman yapar.\n` +
                    `• **.pen** - Saatlik penaltı atışı yapar.\n` +
                    `• **.post [Mesaj]** - Medya postu paylaşır.\n\n` +
                    `💰 **Ekonomi Komutları:**\n` +
                    `• **.bakiye [@üye]** - Cüzdan parasını gösterir.\n` +
                    `• **.send @üye [Miktar]** - Oyuncuya para transfer eder.\n` +
                    `• **.paraver @üye [Miktar]** - Yetkili para ekler.\n` +
                    `• **.paracikar @üye [Miktar]** - Yetkili para siler.\n\n` +
                    `📥 **Yönetim & Kayıt:**\n` +
                    `• **-k @üye [İsim]** - Serbest kayıt başlatır.\n` +
                    `• **.degerver @üye [Miktar]** / **.degercikar @üye [Miktar]**`
                )
                .setFooter({ text: 'Nors Altyapı Sistemi' });
            return message.reply({ embeds: [embed] });
        }

        // --- -k VEYA -kayit KOMUTU ---
        if (icerikKucuk.startsWith('-k') || icerikKucuk.startsWith('-kayit')) {
            if (message.channel.id !== KAYIT_ODASI_ID) return;

            const yetkiliMi = message.member.roles.cache.some(r => KAYIT_YETKILI_ROLLER.includes(r.id));
            if (!yetkiliMi) return message.reply('❌ Kanka bu komutu kullanmak için kayıt yetkilisi rolüne sahip olmalısın.');

            const hedefUye = message.mentions.members.first();
            if (!hedefUye) return message.reply('❌ Kayıt edilecek üyeyi etiketle kanka! Örn: `-k @üye İsim`');

            const metinKismi = icerik.substring(icerik.indexOf('>') + 1).trim();
            if (!metinKismi) return message.reply('❌ Lütfen üyenin sunucudaki isminin ne olacağını yaz kanka!');

            const kelimeler = metinKismi.split(' ');
            const sonKelime = kelimeler[kelimeler.length - 1];

            veriGarantiEt(hedefUye.id);
            oyuncuVerileri[hedefUye.id].deger = sonKelime;

            await hedefUye.setNickname(metinKismi).catch(() => {});

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`k_futbolcu_${hedefUye.id}`).setLabel('⚽ Futbolcu').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`k_td_${hedefUye.id}`).setLabel('📋 Teknik Direktör').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`k_baskan_${hedefUye.id}`).setLabel('👑 Takım Başkanı').setStyle(ButtonStyle.Success)
            );

            return message.reply({
                content: `📝 <@${hedefUye.id}> ismi dökümana işlendi. Rolünü seç kanka:`,
                components: [row]
            });
        }

        // --- ECONOMY: .bakiye ---
        if (icerikKucuk.startsWith('.bakiye')) {
            const hedefUye = message.mentions.members.first() || message.member;
            veriGarantiEt(hedefUye.id);
            return message.reply(`💰 <@${hedefUye.id}> bakiyesi: **${oyuncuVerileri[hedefUye.id].bakiye.toLocaleString('tr-TR')} ₺**`);
        }

        // --- ECONOMY: .send ---
        if (icerikKucuk.startsWith('.send')) {
            const hedefUye = message.mentions.members.first();
            if (!hedefUye) return message.reply('❌ Örn: `.send @üye 5000`');
            if (hedefUye.id === message.author.id) return message.reply('❌ Kendine para gönderemezsin.');

            const argumanlar = icerik.split(' ');
            const miktar = parseInt(argumanlar[argumanlar.length - 1]);

            if (isNaN(miktar) || miktar <= 0) return message.reply('❌ Geçersiz miktar.');

            veriGarantiEt(message.author.id);
            if (oyuncuVerileri[message.author.id].bakiye < miktar) return message.reply('❌ Paran yetersiz kanka.');

            veriGarantiEt(hedefUye.id);
            oyuncuVerileri[message.author.id].bakiye -= miktar;
            oyuncuVerileri[hedefUye.id].bakiye += miktar;

            return message.reply(`✅ <@${message.author.id}>, <@${hedefUye.id}> kişisine **${miktar.toLocaleString('tr-TR')} ₺** gönderdi!`);
        }

        // --- ECONOMY: .paraver ---
        if (icerikKucuk.startsWith('.paraver') || icerikKucuk.startsWith('.paraal')) {
            const yetkiliMi = message.member.roles.cache.some(r => TAKIM_YETKILI_ROLLER.includes(r.id));
            if (!yetkiliMi) return message.reply('❌ Bu komut için yetkin yok kanka!');

            const hedefUye = message.mentions.members.first();
            if (!hedefUye) return message.reply('❌ Örn: `.paraver @üye 10000`');

            const argumanlar = icerik.split(' ');
            const miktar = parseInt(argumanlar[argumanlar.length - 1]);
            if (isNaN(miktar) || miktar <= 0) return message.reply('❌ Geçersiz miktar.');

            veriGarantiEt(hedefUye.id);
            oyuncuVerileri[hedefUye.id].bakiye += miktar;
            return message.reply(`💰 <@${hedefUye.id}> hesabına **${miktar.toLocaleString('tr-TR')} ₺** eklendi.`);
        }

        // --- ECONOMY: .paracikar ---
        if (icerikKucuk.startsWith('.paracikar')) {
            const yetkiliMi = message.member.roles.cache.some(r => TAKIM_YETKILI_ROLLER.includes(r.id));
            if (!yetkiliMi) return message.reply('❌ Bu komut için yetkin yok kanka!');

            const hedefUye = message.mentions.members.first();
            if (!hedefUye) return message.reply('❌ Örn: `.paracikar @üye 5000`');

            const argumanlar = icerik.split(' ');
            const miktar = parseInt(argumanlar[argumanlar.length - 1]);
            if (isNaN(miktar) || miktar <= 0) return message.reply('❌ Geçersiz miktar.');

            veriGarantiEt(hedefUye.id);
            oyuncuVerileri[hedefUye.id].bakiye = Math.max(0, oyuncuVerileri[hedefUye.id].bakiye - miktar);
            return message.reply(`📉 <@${hedefUye.id}> hesabından **${miktar.toLocaleString('tr-TR')} ₺** düşüldü.`);
        }

        // --- .ant KOMUTU ---
        if (icerikKucuk === '.ant') {
            const id = message.author.id;
            if (antrenmanCooldown.has(id) && Date.now() - antrenmanCooldown.get(id) < 3600000) {
                const kalanSure = Math.ceil((3600000 - (Date.now() - antrenmanCooldown.get(id))) / 60000);
                return message.reply(`⏳ Antrenman için **${kalanSure} dakika** beklemelisin.`);
            }
            veriGarantiEt(id);
            if (oyuncuVerileri[id].ant < 5) oyuncuVerileri[id].ant += 1;
            antrenmanCooldown.set(id, Date.now());

            const embed = new EmbedBuilder()
                .setTitle('🎽 Antrenman Yapıldı!')
                .setColor(0x3A82E6)
                .setDescription(`🏃‍♂️ **<@${message.author.id}>** çalışmasını yaptı.\n\n📈 Durum: \`${oyuncuVerileri[id].ant}/5\``);
            return message.reply({ embeds: [embed] });
        }

        // --- .pen KOMUTU ---
        if (icerikKucuk === '.pen') {
            const id = message.author.id;
            if (penaltiCooldown.has(id) && Date.now() - penaltiCooldown.get(id) < 3600000) {
                const kalanSure = Math.ceil((3600000 - (Date.now() - penaltiCooldown.get(id))) / 60000);
                return message.reply(`⏳ Penaltı için kalan süre: **${kalanSure} dakika**.`);
            }
            penaltiCooldown.set(id, Date.now());
            const ihtimaller = ['⚽ GOL!', '🧤 KALECİ KURTARDI!', '💥 TOP DİREKTEN DÖNDÜ!'];
            const sonuc = ihtimaller[Math.floor(Math.random() * ihtimaller.length)];

            const embed = new EmbedBuilder()
                .setTitle('🥅 Penaltı Atışı!')
                .setColor(0xFFAA00)
                .setDescription(`⚽ **<@${message.author.id}>** şutunu çekti...\n\n🎯 Sonuç: **${sonuc}**`);
            return message.reply({ embeds: [embed] });
        }

        // --- .degerver ---
        if (icerikKucuk.startsWith('.degerver')) {
            if (!message.member.roles.cache.has(DEGER_YETKILI_ROL)) return message.reply('❌ Yetkin yok!');
            const hedefUye = message.mentions.members.first();
            if (!hedefUye) return message.reply('❌ Örn: `.degerver @üye 15M€`');

            const argumanlar = icerik.split(' ');
            const yeniDeger = argumanlar[argumanlar.length - 1];

            veriGarantiEt(hedefUye.id);
            oyuncuVerileri[hedefUye.id].deger = yeniDeger;

            let eskiNick = hedefUye.displayName;
            let yeniNick = eskiNick.includes('|') ? eskiNick.split('|')[0].trim() + ` | ${yeniDeger}` : `${eskiNick} | ${yeniDeger}`;
            await hedefUye.setNickname(yeniNick).catch(() => {});

            const bildiriKanali = message.guild.channels.cache.get(DEGER_BILDIRI_KANAL_ID);
            if (bildiriKanali) {
                const logEmbed = new EmbedBuilder().setTitle('📊 Değer Güncellendi!').setColor(0x00FF00).setDescription(`✅ <@${hedefUye.id}> değeri **${yeniDeger}** yapıldı.`);
                bildiriKanali.send({ embeds: [logEmbed] });
            }
            return message.reply(`✅ Değer güncellendi!`);
        }

        // --- .degercikar ---
        if (icerikKucuk.startsWith('.degercikar')) {
            if (!message.member.roles.cache.has(DEGER_YETKILI_ROL)) return message.reply('❌ Yetkin yok!');
            const hedefUye = message.mentions.members.first();
            if (!hedefUye) return message.reply('❌ Örn: `.degercikar @üye 5M€`');

            const argumanlar = icerik.split(' ');
            const dusenDeger = argumanlar[argumanlar.length - 1];

            veriGarantiEt(hedefUye.id);
            oyuncuVerileri[hedefUye.id].deger = dusenDeger;

            let eskiNick = hedefUye.displayName;
            let yeniNick = eskiNick.includes('|') ? eskiNick.split('|')[0].trim() + ` | ${dusenDeger}` : `${eskiNick} | ${dusenDeger}`;
            await hedefUye.setNickname(yeniNick).catch(() => {});

            const bildiriKanali = message.guild.channels.cache.get(DEGER_BILDIRI_KANAL_ID);
            if (bildiriKanali) {
                const logEmbed = new EmbedBuilder().setTitle('📉 Değer Düşürüldü!').setColor(0xFF0000).setDescription(`⚠️ <@${hedefUye.id}> değeri **${dusenDeger}** yapıldı.`);
                bildiriKanali.send({ embeds: [logEmbed] });
            }
            return message.reply(`⚠️ Değer düşürüldü.`);
        }

        // --- .profil ---
        if (icerikKucuk.startsWith('.profil')) {
            const hedefUye = message.mentions.members.first() || message.member;
            veriGarantiEt(hedefUye.id);

            const profilEmbed = new EmbedBuilder()
                .setTitle(`👤 ${hedefUye.user.username} Profili`)
                .setThumbnail(hedefUye.user.displayAvatarURL({ dynamic: true }))
                .setColor(0x2F3136)
                .addFields(
                    { name: '🎽 Antrenman', value: `\`${oyuncuVerileri[hedefUye.id].ant}/5\``, inline: true },
                    { name: '💰 Piyasa Değeri', value: `\`${oyuncuVerileri[hedefUye.id].deger}\``, inline: true },
                    { name: '💵 Cüzdan', value: `\`${oyuncuVerileri[hedefUye.id].bakiye.toLocaleString('tr-TR')} ₺\``, inline: false }
                );
            return message.reply({ embeds: [profilEmbed] });
        }

        // --- TAKIM VE POST KOMUTLARI ---
        if (icerikKucuk.startsWith('.takimkur')) {
            const yetkiliMi = message.member.roles.cache.some(r => TAKIM_YETKILI_ROLLER.includes(r.id));
            if (!yetkiliMi) return message.reply('❌ Yetkiniz yok.');
            const takimAdi = icerik.substring(9).trim();
            if (!takimAdi) return message.reply('❌ Takım adı girilmedi.');
            takimlar[takimAdi] = { baskan: 'Girilmedi', oyuncular: [] };
            return message.reply(`✅ **${takimAdi}** kuruldu!`);
        }

        if (icerikKucuk.startsWith('.takimliste')) {
            const tumTakimlar = Object.keys(takimlar);
            if (tumTakimlar.length === 0) return message.reply('📭 Takım bulunamadı.');
            return message.reply(`🏆 **Takımlar:**\n${tumTakimlar.map(t => `• ${t}`).join('\n')}`);
        }

        if (icerikKucuk.startsWith('.oyuncuekle')) {
            const yetkiliMi = message.member.roles.cache.some(r => OYUNCU_YETKILI_ROLLER.includes(r.id));
            if (!yetkiliMi) return message.reply('❌ Yetkiniz yok.');
            const hedefUye = message.mentions.members.first();
            const takimAdi = icerik.substring(icerik.indexOf('>') + 1).trim();
            if (!takimlar[takimAdi]) return message.reply('❌ Takım bulunamadı.');
            if (hedefUye.roles.cache.has(ROL_BASKAN)) takimlar[takimAdi].baskan = `<@${hedefUye.id}>`;
            else takimlar[takimAdi].oyuncular.push(`<@${hedefUye.id}>`);
            return message.reply(`✅ Oyuncu eklendi.`);
        }

        if (icerikKucuk.startsWith('.oyuncucikar')) {
            const yetkiliMi = message.member.roles.cache.some(r => OYUNCU_YETKILI_ROLLER.includes(r.id));
            if (!yetkiliMi) return message.reply('❌ Yetkiniz yok.');
            const hedefUye = message.mentions.members.first();
            const takimAdi = icerik.substring(icerik.indexOf('>') + 1).trim();
            if (!takimlar[takimAdi]) return message.reply('❌ Takım bulunamadı.');
            takimlar[takimAdi].oyuncular = takimlar[takimAdi].oyuncular.filter(o => o !== `<@${hedefUye.id}>`);
            return message.reply(`📭 Oyuncu çıkarıldı.`);
        }

        if (icerikKucuk.startsWith('.post')) {
            const duyuruMetni = icerik.substring(5).trim();
            if (!duyuruMetni) return message.reply('❌ Mesaj yaz.');
            const embed = new EmbedBuilder().setTitle('📢 Post').setThumbnail(message.author.displayAvatarURL({ dynamic: true })).setColor(0x2F3136).setDescription(duyuruMetni);
            return message.reply({ embeds: [embed] });
        }

    } catch (e) { console.error(e); }
});

// ==========================================
// BUTON ETKİLEŞİM MERKEZİ (18194.jpg DAHİL)
// ==========================================
client.on('interactionCreate', async (interaction) => {
    try {
        if (!interaction.isButton()) return;

        // --- 1. GÖRSELDEKİ "NORMAL KAYIT" BUTON BASILMA DURUMU ---
        if (interaction.customId.startsWith('btn_kayit_baslat_')) {
            const yetkiliMi = interaction.member.roles.cache.some(r => KAYIT_YETKILI_ROLLER.includes(r.id));
            if (!yetkiliMi) {
                return interaction.reply({ content: '❌ Bu butona basarak kayıt başlatmak için Kayıt Yetkilisi olmalısın kanka!', ephemeral: true });
            }

            const hedefUyeId = interaction.customId.split('_')[3];
            return interaction.reply({ 
                content: `🚀 Kayıt başlatıldı kanka! Lütfen sohbet alanına direkt \`-k <@${hedefUyeId}> İstediğin İsim\` yazarak işlemi tamamla.`, 
                ephemeral: true 
            });
        }

        // --- 2. ROL SEÇİM BUTONLARI (-k KOMUTUNDAN SONRA GELEN) ---
        const [prefix, rolTipi, deleteId] = interaction.customId.split('_');
        if (prefix !== 'k') return;

        const guild = interaction.guild;
        const hedefUye
                
