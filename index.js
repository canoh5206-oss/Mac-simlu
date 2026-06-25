const { 
    Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, EmbedBuilder 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers
    ]
});

const YETKILI_ROL_ID = '1512316879551860796'; // !k ve .ara kullanabilecek rol
const YONETICI_ROL_ID = '1513269024866304091'; // Biletlere bakacak yönetici rolü
const TICKET_KATEGORI_ID = '1514324399900196895'; // Biletlerin açılacağı kategori

let kayitSayilari = {}; // Yetkililerin kayıt sayılarını tutar

client.once('ready', () => {
    console.log(`✅ Sistem Aktif: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const isYetkili = message.member.roles.cache.has(YETKILI_ROL_ID) || message.member.permissions.has('Administrator');

    // --- 🎫 TICKET KURULUM KOMUTU ---
    if (message.content === '.ticket-kur' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_olustur').setLabel('📩 DESTEK TALEBİ OLUŞTUR').setStyle(ButtonStyle.Primary)
        );
        return message.channel.send({ content: '👇 **Destek almak için aşağıdaki butona tıkla:**', components: [row] });
    }

    if (!isYetkili) return;

    // --- !k KOMUTU ---
    if (message.content.startsWith('!k')) {
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

            await message.reply({ 
                content: `📝 **KAYIT BAŞARILI KANKA!**\n\n👤 **Kayıt Edilen Üye:** ${hedonUye}\n🏷️ **Yeni Takma Adı:** \`${yeniTakmaAd}\`\n\n👇 **Lütfen aşağıdaki butonlardan rolünü seç:**`, 
                components: [row] 
            });

            kayitSayilari[message.author.id] = (kayitSayilari[message.author.id] || 0) + 1;
        } catch (e) { message.reply('❌ Yetki hatası! İsmi değiştirilemedi.'); }
    }

    // --- .ara KOMUTU (18094.jpg Görselindeki Orijinal Kusursuz Sürüm) ---
    if (message.content.startsWith('.ara')) {
        let aranan = message.content.replace('.ara', '').trim();
        if (!aranan) return message.reply('❌ **Hata:** Bir kriter gir kanka. Örn: `.ara SNT`');

        await message.guild.members.fetch(); 
        
        const arananKucuk = aranan.toLowerCase().toLocaleLowerCase('tr-TR');
        const fransaKelimeleri = ['fransa', 'fransız', 'fransiz', 'fr', 'fra', '🇲🇫', '🇫🇷'];
        const fransaAraniyorMu = fransaKelimeleri.includes(arananKucuk);

        const sonuclar = message.guild.members.cache.filter(m => {
            const nick = m.nickname ? m.nickname.toLowerCase().toLocaleLowerCase('tr-TR') : '';
            const username = m.user.username.toLowerCase().toLocaleLowerCase('tr-TR');
            
            if (fransaAraniyorMu) {
                return nick.includes('🇲🇫') || nick.includes('🇫🇷') || nick.includes('fransa') || nick.includes('fransiz') ||
                       username.includes('fransa') || username.includes('fransiz');
            }
            return nick.includes(arananKucuk) || username.includes(arananKucuk) || (m.nickname && m.nickname.includes(aranan));
        });

        if (sonuclar.size === 0) return message.reply(`🔍 Aradığın kriterde (${aranan}) kimseyi bulamadım kanka.`);

        // Kanka sadece profil emojisi ve m.displayName basıyoruz! 
        // İsimlerin arkasındaki o uzun "@" kısımları zaten sunucudaki adlarında kayıtlı olduğu için otomatik jilet gibi çıkacak!
        const liste = sonuclar.map(m => `👤 ${m.displayName}`).slice(0, 15).join('\n');
        
        const embed = new EmbedBuilder()
            .setTitle(`🔍 Arama Sonuçları: "${aranan}"`)
            .setDescription(liste)
            .setColor(0xF1C40F)
            .setFooter({ text: `${sonuclar.size} kişi bulundu.` });

        // Temiz bir şekilde embed kutusunu gönderiyoruz, sıfır pingleme, sıfır sayı hatası!
        message.reply({ embeds: [embed] });
    }


                    
