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
let kayitVerileri = {}; 
let takimlar = {}; 
let oyuncuVerileri = {}; 

let antrenmanCooldown = new Map(); 
let penaltiCooldown = new Map();   

const KUFUR_LISTESI = ['amk', 'aq', 'orospu', 'piç', 'sik', 'göt', 'yarrak', '31', 'oe', 'oropusu'];

function veriGarantiEt(id) {
    if (!oyuncuVerileri[id]) {
        oyuncuVerileri[id] = { ant: 0, deger: "Girilmedi" };
    }
}

client.once('ready', () => {
    console.log(`⚽ Nors Altyapı, Giriş Güvenliği ve Değer Sistemi Aktif Kanka!`);
});

process.on('unhandledRejection', (reason, p) => { console.error(reason); });
process.on('uncaughtException', (err, origin) => { console.error(err); });

// ==========================================
// GÜVENLİKLİ GİRİŞ SİSTEMİ
// ==========================================
client.on('guildMemberAdd', async (member) => {
    const kayitKanali = member.guild.channels.cache.get(KAYIT_ODASI_ID);
    if (!kayitKanali) return;

    const olusturmaTarihi = member.user.createdAt;
    const simdi = new Date();
    const hesapYasiGun = Math.floor((simdi - olusturmaTarihi) / (1000 * 60 * 60 * 24));
    
    const guvenilirMi = hesapYasiGun >= 30;
    const guvenlikDurumu = guvenilirMi ? '✅ Güvenilir Üye' : '⚠️ Güvenilir Değil (Şüpheli Hesap)';
    const embedRenk = guvenilirMi ? 0x00FF00 : 0xFF0000;

    const girisEmbed = new EmbedBuilder()
        .setTitle('📥 Sunucuya Yeni Biri Katıldı!')
        .setDescription(`Kayıt odasına hoş geldin <@${member.id}>! Lütfen yetkililerin seni kaydetmesini bekle kanka.`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setColor(embedRenk)
        .addFields(
            { name: '📅 Hesap Oluşturma Tarihi', value: `\`${olusturmaTarihi.toLocaleDateString('tr-TR')}\` (${hesapYasiGun} gün önce)`, inline: false },
            { name: '🛡️ Güvenlik Analizi', value: `**${guvenlikDurumu}**`, inline: false }
        )
        .setFooter({ text: 'Nors Giriş Kontrol Sistemi' });

    kayitKanali.send({ 
        content: `🔔 <@&1520768910947782687> biri katıldı kayıt et!`, 
        embeds: [girisEmbed] 
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

        // --- 1. -k VEYA -kayit KOMUTLARI ---
        if (icerikKucuk.startsWith('-k') || icerikKucuk.startsWith('-kayit')) {
            if (message.channel.id !== KAYIT_ODASI_ID) {
                const hataEmbed = new EmbedBuilder()
                    .setTitle('🔻 HATA!')
                    .setDescription(`Komut, bu kanalda kullanılmaz. Lütfen seçili olan <#${KAYIT_ODASI_ID}> kanalında kullanın kanka.`)
                    .setColor(0xFF0000);
                return message.reply({ embeds: [hataEmbed] });
            }

            const yetkiliMi = message.member.roles.cache.some(r => KAYIT_YETKILI_ROLLER.includes(r.id));
            if (!yetkiliMi) return message.reply('❌ Kanka bu komutu kullanmak için kayıt yetkilisi rolüne sahip olmalısın.');

            const hedefUye = message.mentions.members.first();
            if (!hedefUye) return message.reply('❌ Kayıt edilecek üyeyi etiketle kanka! Örn: `-k @üye İsim | Mevki | Değer`');

            const metinKismi = icerik.substring(icerik.indexOf('>') + 1).trim();
            if (!metinKismi.includes('|')) return message.reply('❌ Format hatalı kanka! Örn: `İsim | Mevki | Değer` şeklinde yazmalısın.');

            const parcalar = metinKismi.split('|');
            const baslangicDeger = parcalar[parcalar.length - 1].trim();
            veriGarantiEt(hedefUye.id);
            oyuncuVerileri[hedefUye.id].deger = baslangicDeger;

            await hedefUye.setNickname(metinKismi).catch(() => {});

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`k_futbolcu_${hedefUye.id}`).setLabel('⚽ Futbolcu').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`k_td_${hedefUye.id}`).setLabel('📋 Teknik Direktör').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`k_baskan_${hedefUye.id}`).setLabel('👑 Takım Başkanı').setStyle(ButtonStyle.Success)
            );

            return message.reply({
                content: `📝 <@${hedefUye.id}> adı dökümana işlendi. Rolünü seç kanka:`,
                components: [row]
            });
        }

        // --- 2. .ant KOMUTU (SIRALI 1/5, 2/5 DÜZENİ) ---
        if (icerikKucuk === '.ant') {
            const id = message.author.id;
            if (antrenmanCooldown.has(id) && Date.now() - antrenmanCooldown.get(id) < 3600000) {
                const kalanSure = Math.ceil((3600000 - (Date.now() - antrenmanCooldown.get(id))) / 60000);
                return message.reply(`⏳ Kanka antrenman saatliktir! Tekrar çalışmak için **${kalanSure} dakika** beklemelisin.`);
            }

            veriGarantiEt(id);
            if (oyuncuVerileri[id].ant < 5) {
                oyuncuVerileri[id].ant += 1;
            }

            antrenmanCooldown.set(id, Date.now());

            const embed = new EmbedBuilder()
                .setTitle('🎽 Antrenman Başarıyla Yapıldı!')
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .setColor(0x3A82E6)
                .setDescription(`🏃‍♂️ **<@${message.author.id}>** tesislere inerek saatlik çalışmasını yaptı.\n\n📈 **Güncel Durum:** \`${oyuncuVerileri[id].ant}/5\`\n⏰ *Bir sonraki antrenman 1 saat sonra açılır.*`);
            
            return message.reply({ embeds: [embed] });
        }

        // --- 3. .pen KOMUTU (1 SAAT COOLDOWN) ---
        if (icerikKucuk === '.pen') {
            const id = message.author.id;
            if (penaltiCooldown.has(id) && Date.now() - penaltiCooldown.get(id) < 3600000) {
                const kalanSure = Math.ceil((3600000 - (Date.now() - penaltiCooldown.get(id))) / 60000);
                return message.reply(`⏳ Saatte sadece bir kez penaltı çalışabilirsin kanka! Kalan süre: **${kalanSure} dakika**.`);
            }

            penaltiCooldown.set(id, Date.now());
            const ihtimaller = ['⚽ GOL!', '🧤 KALECİ KURTARDI!', '💥 TOP DİREKTEN DÖNDÜ!'];
            const sonuc = ihtimaller[Math.floor(Math.random() * ihtimaller.length)];

            const embed = new EmbedBuilder()
                .setTitle('🥅 Penaltı Atışı!')
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .setColor(0xFFAA00)
                .setDescription(`⚽ **<@${message.author.id}>** beyaz noktadan şutunu çekti...\n\n🎯 **Sonuç:** **${sonuc}**`);
            
            return message.reply({ embeds: [embed] });
        }

        // --- 4. .degerver KOMUTU ---
        if (icerikKucuk.startsWith('.degerver')) {
            if (!message.member.roles.cache.has(DEGER_YETKILI_ROL)) {
                return message.reply('❌ Kanka bu komutu kullanmaya yetkin yok!');
            }

            const hedefUye = message.mentions.members.first();
            if (!hedefUye) return message.reply('❌ Değer verilecek oyuncuyu etiketle kanka! Örn: `.degerver @üye 15M€`');

            const argumanlar = icerik.split(' ');
            const yeniDeger = argumanlar[argumanlar.length - 1]; 
            if (!yeniDeger || yeniDeger.includes('@')) return message.reply('❌ Lütfen verilecek değer miktarını yaz kanka!');

            veriGarantiEt(hedefUye.id);
            oyuncuVerileri[hedefUye.id].deger = yeniDeger;

            let eskiNick = hedefUye.displayName;
            let yeniNick = eskiNick;
            if (eskiNick.includes('|')) {
                const parcalar = eskiNick.split('|');
                parcalar[parcalar.length - 1] = ` ${yeniDeger}`;
                yeniNick = parcalar.join('|');
            } else {
                yeniNick = `${eskiNick} | ${yeniDeger}`;
            }
            await hedefUye.setNickname(yeniNick).catch(() => {});

            const bildiriKanali = message.guild.channels.cache.get(DEGER_BILDIRI_KANAL_ID);
            if (bildiriKanali) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📊 Değer Güncellemesi Yapıldı!')
                    .setColor(0x00FF00)
                    .setDescription(`✅ <@${hedefUye.id}> oyuncusunun piyasa değeri **${yeniDeger}** olarak güncellendi.\n\n👤 **İşlemi Yapan Yetkili:** <@${message.author.id}>`)
                    .setThumbnail(hedefUye.user.displayAvatarURL({ dynamic: true }));
                bildiriKanali.send({ embeds: [logEmbed] });
            }
            return message.reply(`✅ Değer güncellendi ve bildirisi geçildi!`);
        }

        // --- 5. .degercikar KOMUTU ---
        if (icerikKucuk.startsWith('.degercikar')) {
            if (!message.member.roles.cache.has(DEGER_YETKILI_ROL)) {
                return message.reply('❌ Kanka bu komutu kullanmaya yetkin yok!');
            }

            const hedefUye = message.mentions.members.first();
            if (!hedefUye) return message.reply('❌ Değeri düşürülecek oyuncuyu etiketle kanka! Örn: `.degercikar @üye 5M€`');

            const argumanlar = icerik.split(' ');
            const dusenDeger = argumanlar[argumanlar.length - 1];

            veriGarantiEt(hedefUye.id);
            oyuncuVerileri[hedefUye.id].deger = dusenDeger;

            let eskiNick = hedefUye.displayName;
            let yeniNick = eskiNick;
            if (eskiNick.includes('|')) {
                const parcalar = eskiNick.split('|');
                parcalar[parcalar.length - 1] = ` ${dusenDeger}`;
                yeniNick = parcalar.join('|');
            }
            await hedefUye.setNickname(yeniNick).catch(() => {});

            const bildiriKanali = message.guild.channels.cache.get(DEGER_BILDIRI_KANAL_ID);
            if (bildiriKanali) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📉 Değer Azaltma / Düzeltme Bildirisi')
                    .setColor(0xFF0000)
                    .setDescription(`⚠️ <@${hedefUye.id}> oyuncusunun değeri **${dusenDeger}** olarak düzeltildi.\n\n👤 **İşlemi Yapan Yetkili:** <@${message.author.id}>`)
                    .setThumbnail(hedefUye.user.displayAvatarURL({ dynamic: true }));
                bildiriKanali.send({ embeds: [logEmbed] });
            }
            return message.reply(`⚠️ Değer **${dusenDeger}** seviyesine indirildi.`);
        }

        // --- 6. .profil KOMUTU ---
        if (icerikKucuk.startsWith('.profil')) {
            const hedefUye = message.mentions.members.first() || message.member;
            veriGarantiEt(hedefUye.id);

            const antDurum = oyuncuVerileri[hedefUye.id].ant;
            const piyasaDegeri = oyuncuVerileri[hedefUye.id].deger;

            let penDurum = '✅ Atış Hazır';
            if (penaltiCooldown.has(hedefUye.id) && Date.now() - penaltiCooldown.get(hedefUye.id) < 3600000) {
                const kalanDk = Math.ceil((3600000 - (Date.now() - penaltiCooldown.get(hedefUye.id))) / 60000);
                penDurum = `❌ Bekleniyor (${kalanDk} dk)`;
            }

            const profilEmbed = new EmbedBuilder()
                .setTitle(`👤 ${hedefUye.user.username} Oyuncu Profili`)
                .setThumbnail(hedefUye.user.displayAvatarURL({ dynamic: true }))
                .setColor(0x2F3136)
                .addFields(
                    { name: '🎽 Antrenman Seviyesi', value: `\`${antDurum}/5\``, inline: true },
                    { name: '🥅 Penaltı Durumu', value: `\`${penDurum}\``, inline: true },
                    { name: '💰 Güncel Değer', value: `\`${piyasaDegeri}\``, inline: true }
                )
                .setFooter({ text: 'Nors Futbolcu Kartı' });

            return message.reply({ embeds: [profilEmbed] });
        }

        // --- 7. DİĞER KOMUTLAR (.takimkur, .takimliste, .oyuncuekle, .oyuncucikar, .post) ---
        if (icerikKucuk.startsWith('.takimkur')) {
            const yetkiliMi = message.member.roles.cache.some(r => TAKIM_YETKILI_ROLLER.includes(r.id));
            if (!yetkiliMi) return message.reply('❌ Yetkiniz yok.');
            const takimAdi = icerik.substring(9).trim();
            if (!takimAdi) return message.reply('❌ Takım adı girilmedi.');
            if (takimlar[takimAdi]) return message.reply('❌ Takım zaten var.');
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
// BUTTON INTERACTION (KAYIT TAMAMLAMA)
// ==========================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    const [prefix, rolTipi, deleteId] = interaction.customId.split('_');
    if (prefix !== 'k') return;

    try {
        const guild = interaction.guild;
        const hedefUye = await guild.members.fetch(deleteId).catch(() => null);
        if (!hedefUye) return interaction.reply({ content: '❌ Kullanıcı bulunamadı kanka!', ephemeral: true });

        let rolId = ''; let rolIsmi = '';
        if (rolTipi === 'futbolcu') { rolId = ROL_FUTBOLCU; rolIsmi = 'Futbolcu'; }
        else if (rolTipi === 'td') { rolId = ROL_TD; rolIsmi = 'Teknik Direktör'; }
        else if (rolTipi === 'baskan') { rolId = ROL_BASKAN; rolIsmi = 'Takım Başkanı'; }

        await hedefUye.roles.add(rolId).catch(() => {});
        await interaction.message.delete().catch(() => {});

        const duyuruKanali = guild.channels.cache.get(KAYIT_DUYURU_KANAL_ID);
        if (duyuruKanali) {
            await duyuruKanali.send({ content: `📢 **<@${hedefUye.id}> aramıza katıldı.**` }).catch(() => {});
            const embed = new EmbedBuilder()
                .setTitle('✨ Kayıt Yapıldı!')
                .setDescription(`🤝 • <@${hedefUye.id}> aramıza **${rolIsmi}** rolleriyle katıldı.\n\n🌟 • **Kaydı gerçekleştiren yetkili:**\n<@${interaction.user.id}>\n\n🐼 • **Aramıza hoş geldin**\n<@${hedefUye.id}>`)
                .setColor(0x2F3136)
                .setThumbnail(hedefUye.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Nors Kayıt Sistemi' });
            await duyuruKanali.send({ embeds: [embed] }).catch(() => {});
        }
        return interaction.reply({ content: `✅ İşlem tamamlandı kanka!`, ephemeral: true });
    } catch (err) { console.error(err); }
});

client.login(process.env.TOKEN);
                
            
                    
