const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers
    ]
});

const SUNUCU_ID = '1511859511634301059'; 
const YETKILI_ROL_ID = '1512316879551860796'; // !k komutu yetkilisi
const BILGI_KANAL_ID = '1515123600502427739'; 

// Özel Yetki Rolleri
const TD_ROL_ID = '1513270136176381953'; // .dm yetkilisi
const BASKAN_ROL_ID = '1512323399467139213'; // .dm yetkilisi
const OWNER_ROL_ID = '1513269024866304091'; // .dmlerkapat ve .dmlerac yetkilisi

const ROL_MAP = {
    'futbolcu': '1512130383070892094',
    'baskan': '1512323399467139213',
    'td': '1513270136176381953'
};

let kayitSayilari = {};
let dmTeklifleriAcik = true; // DM durumunu hafızada tutan değişken

client.once('ready', () => {
    console.log(`✅ Kaliteli Transfer, Rol Sınırlandırması ve DM Aç/Kapat Sistemi Aktif: ${client.user.tag}`);
});

// Çökme Önleyiciler
process.on('unhandledRejection', (reason, p) => { console.error(reason); });
process.on('uncaughtException', (err, origin) => { console.error(err); });

client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot) return;

        // --- 🔒 OWNER DM KONTROL KOMUTLARI ---
        if (message.content === '.dmlerkapat') {
            if (!message.member.roles.cache.has(OWNER_ROL_ID) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.reply('❌ **Hata:** Bu komutu sadece Kurucu / Owner kullanabilir kanka!');
            }
            dmTeklifleriAcik = false;
            return message.reply('🔒 **Sistem Kilitlendi:** DM transfer teklifi gönderimleri geçici olarak durduruldu!');
        }

        if (message.content === '.dmlerac') {
            if (!message.member.roles.cache.has(OWNER_ROL_ID) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.reply('❌ **Hata:** Bu komutu sadece Kurucu / Owner kullanabilir kanka!');
            }
            dmTeklifleriAcik = true;
            return message.reply('🔓 **Sistem Aktif:** DM transfer teklifi gönderimleri tekrar açıldı kanka!');
        }

        // --- !k KOMUTU (Orijinal Yapın) ---
        if (message.content.startsWith('!k')) {
            if (!message.member.roles.cache.has(YETKILI_ROL_ID)) {
                return message.reply('❌ **Hata:** Kayıt yapma yetkin yok kanka!');
            }

            const hedonUye = message.mentions.members.first();
            if (!hedonUye) return message.reply('❌ Kullanıcıyı etiketle kanka!');

            const metinKismi = message.content.substring(message.content.indexOf('>') + 1).trim();
            const parcalar = metinKismi.split('|').map(p => p.trim());
            if (parcalar.length < 4) return message.reply('❌ Format: `!k @user isim | mevki | bayrak | değer`');

            const yeniTakmaAd = `${parcalar[0]} | ${parcalar[1].toUpperCase()} | ${parcalar[2]} | ${parcalar[3]}`;

            try {
                await hedonUye.setNickname(yeniTakmaAd);
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`rol_futbolcu_${hedonUye.id}`).setLabel('⚽ Futbolcu').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId(`rol_baskan_${hedonUye.id}`).setLabel('👑 Başkan').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`rol_td_${hedonUye.id}`).setLabel('📋 TD').setStyle(ButtonStyle.Danger)
                );

                const embed = new EmbedBuilder()
                    .setTitle('📝 Kayıt Başarılı')
                    .setDescription(`👤 **Üye:** ${hedonUye}\n🏷️ **Takma Ad:** \`${yeniTakmaAd}\`\n\n👇 **Rol seçimi:**`)
                    .setColor(0x00FF00);

                await message.reply({ embeds: [embed], components: [row] });
                kayitSayilari[message.author.id] = (kayitSayilari[message.author.id] || 0) + 1;
            } catch (e) {
                message.reply('❌ Bot yetkilerini kontrol et kanka!');
            }
        }

        // --- .dm TRANSFER TEKLİF KOMUTU (Sadece Başkan ve TD) ---
        if (message.content.startsWith('.dm')) {
            // Sadece Teknik Direktör veya Başkan rolü olanlar atabilir kanka
            const yetkiliMi = message.member.roles.cache.has(TD_ROL_ID) || message.member.roles.cache.has(BASKAN_ROL_ID) || message.member.permissions.has(PermissionsBitField.Flags.Administrator);
            if (!yetkiliMi) {
                return message.reply('❌ **Hata:** Bu komutu sadece **Teknik Direktör** veya **Başkan** rolüne sahip kişiler kullanabilir kanka!');
            }

            // Owner kapatmış mı kontrolü
            if (!dmTeklifleriAcik) {
                return message.reply('❌ **Hata:** DM transfer teklifleri şu anda Kurucu / Owner tarafından kapatılmış durumda!');
            }

            const hedefUye = message.mentions.members.first();
            if (!hedefUye) return message.reply('❌ **Hata:** Teklif gönderilecek oyuncuyu etiketle kanka! Örn: `.dm @Oyuncu Real Madrid...`');

            const komutParcalari = message.content.split(' ');
            komutParcalari.shift(); 
            komutParcalari.shift(); 
            const teklifIcerik = komutParcalari.join(' ').trim();

            if (!teklifIcerik) return message.reply('❌ **Hata:** Teklif detaylarını yazmadın kanka!');

            try {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`teklif_evet_${hedefUye.id}`).setLabel('🤝 Kabul Et').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`teklif_hayir_${hedefUye.id}`).setLabel('❌ Reddet').setStyle(ButtonStyle.Danger)
                );

                await hedefUye.send({
                    content: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🚨 **YENİ RESMİ TRANSFER TEKLİFİ** 🚨\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📢 **Sayın** <@${hedefUye.id}>, **kulübümüze sizin için resmi bir transfer teklifi ulaşmıştır.**\n\n📋 **Teklif Detayları ve Şartlar:**\n\`\`\`📌 ${teklifIcerik}\`\`\`\n\n👇 **Kararınızı aşağıdaki butonları kullanarak bildirebilirsiniz:**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                    components: [row]
                });

                const bilgiKanali = client.channels.cache.get(BILGI_KANAL_ID) || await client.channels.fetch(BILGI_KANAL_ID).catch(() => null);
                if (bilgiKanali) {
                    await bilgiKanali.send({ 
                        content: `📊 **TRANSFER GÜNDEMİ** 🔔\n──────────────────────────────\n📩 **Teklif gönderdi**\n👤 **Muhatap Oyuncu:** <@${hedefUye.id}>\n📝 **Anlaşma Şartları:** \`${teklifIcerik}\`\n──────────────────────────────`,
                        allowedMentions: { users: [] }
                    }).catch(() => {});
                }

                return message.reply(`✅ **Başarılı:** Teklif en kaliteli haliyle ${hedefUye.displayName} kullanıcısının DM kutusuna iletildi!`);
            } catch (error) {
                return message.reply('❌ **Hata:** Oyuncunun DM kutusu kapalı olduğu için teklif iletilemedi kanka!');
            }
        }

        // --- .ara KOMUTU (Orijinal Yapın) ---
        if (message.content.startsWith('.ara')) {
            let aranan = message.content.replace('.ara', '').trim();
            if (!aranan) return message.reply('❌ **Hata:** Bir isim, mevki veya bayrak gir kanka. Örn: `.ara fransa`');

            const guild = client.guilds.cache.get(SUNUCU_ID) || message.guild;
            try { await guild.members.fetch(); } catch (fErr) { console.error("Üyeler çekilemedi:", fErr); }
            
            const arananKucuk = aranan.toLowerCase().toLocaleLowerCase('tr-TR');
            const fransaKelimeleri = ['fransa', 'fransız', 'fransiz', 'fr', 'fra', '🇲🇫', '🇫🇷'];
            const fransaAraniyorMu = fransaKelimeleri.includes(arananKucuk);

            const sonuclar = guild.members.cache.filter(m => {
                const nick = m.nickname ? m.nickname.toLowerCase().toLocaleLowerCase('tr-TR') : '';
                const username = m.user.username.toLowerCase().toLocaleLowerCase('tr-TR');
                
                if (fransaAraniyorMu) {
                    return nick.includes('🇲🇫') || nick.includes('🇫🇷') || nick.includes('fransa') || nick.includes('fransiz') ||
                           username.includes('fransa') || username.includes('fransiz');
                }
                return nick.includes(arananKucuk) || username.includes(arananKucuk) || (m.nickname && m.nickname.includes(aranan));
            });

            if (sonuclar.size === 0) return message.reply(`🔍 Aradığın kriterde (${aranan}) kimseyi bulamadım kanka.`);

            const liste = sonuclar.map(m => `👤 **${m.displayName}** - <@${m.user.id}>`).slice(0, 20).join('\n');
            
            return message.reply({
                content: `🔍 **Arama Sonuçları: "${aranan}"**\n\n${liste}\n\n📊 **${sonuclar.size} kişi bulundu.**`,
                allowedMentions: { users: [] }
            });
        }
    } catch (mainErr) { console.error(mainErr); }
});

// --- INTERACTION İŞLEYİCİ (Buton İşlemleri) ---
client.on('interactionCreate', async (interaction) => {
    try {
        if (!interaction.isButton()) return;
        
        const [prefix, secenek, userId] = interaction.customId.split('_');
        const bilgiKanali = client.channels.cache.get(BILGI_KANAL_ID) || await client.channels.fetch(BILGI_KANAL_ID).catch(() => null);

        // DM Buton Yanıtları
        if (prefix === 'teklif') {
            await interaction.deferUpdate().catch(() => {}); 
            await interaction.editReply({ components: [] }).catch(() => {});

            if (secenek === 'evet') {
                if (bilgiKanali) {
                    await bilgiKanali.send({ 
                        content: `📊 **TRANSFER GÜNDEMİ** 🔔\n──────────────────────────────\n🤝 **Teklif kabul etti**\n👤 **Oyuncu:** <@${userId}> kendisine gelen resmi teklifi **kabul etti**! Yeni kariyerinde başarılar. 🚀\n──────────────────────────────`,
                        allowedMentions: { users: [] }
                    }).catch(() => {});
                }
                return;
            } 
            
            if (secenek === 'hayir') {
                if (bilgiKanali) {
                    await bilgiKanali.send({ 
                        content: `📊 **TRANSFER GÜNDEMİ** 🔔\n──────────────────────────────\n❌ **Teklifi reddetti**\n👤 **Oyuncu:** <@${userId}> kendisine gelen resmi teklifi **reddetti** ve kulübünde kalmaya karar verdi! ⚔️\n──────────────────────────────`,
                        allowedMentions: { users: [] }
                    }).catch(() => {});
                }
                return;
            }
        }

        // Orijinal Kayıt Rol Butonları Yapın
        if (prefix !== 'rol') return;

        const member = await interaction.guild.members.fetch(userId);
        if (!member) return interaction.reply({ content: '❌ Kullanıcı bulunamadı!', ephemeral: true });

        await member.roles.add(ROL_MAP[secenek]);
        const toplamKayit = kayitSayilari[interaction.user.id] || 0;
        
        return interaction.reply({ 
            content: `✅ **${member.displayName}** kullanıcısına rol verildi!\n📈 **Toplam Kayıt Sayın:** \`${toplamKayit}\`` 
        });
    } catch (e) { console.error(e); }
});

client.login(process.env.TOKEN);
                                     
        
