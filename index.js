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
const KAYITLI_ROL_ID = "1521842733462061227";      
const KAYITSIZ_ROL_ID = "1521842738838896781";     
const YETKILI_ROL_ID = "1521842728202141718";      

const GIRIS_LOG_KANAL_ID = "1521844270473154571";  
const KAYIT_LOG_KANAL_ID = "1521842778240188528";  

client.once('ready', () => {
    console.log(`[BOT] ${client.user.tag} başarıyla aktif edildi!`);
});

// --- OTO ROL SİSTEMİ ---
client.on('guildMemberAdd', async (member) => {
    try {
        await member.roles.add(KAYITSIZ_ROL_ID);
        
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
        console.error("Oto rol hatası:", error);
    }
});

// --- KAYIT KOMUTU ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'k') {
        if (!message.member.roles.cache.has(YETKILI_ROL_ID)) {
            return message.reply("❌ Bu komutu kullanmak için gerekli yetkiye sahip değilsin!");
        }

        const hedefUye = message.mentions.members.first();
        const yeniIsim = args.slice(1).join(" "); 

        if (!hedefUye || !yeniIsim) {
            return message.reply(`❌ **Hatalı Kullanım!**\nFormat: \`.k @üye yeni_isim\``);
        }

        try {
            await hedefUye.setNickname(yeniIsim);
            await hedefUye.roles.add(KAYITLI_ROL_ID);
            
            if (hedefUye.roles.cache.has(KAYITSIZ_ROL_ID)) {
                await hedefUye.roles.remove(KAYITSIZ_ROL_ID);
            }

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

            const kayitLogKanal = message.guild.channels.cache.get(KAYIT_LOG_KANAL_ID);
            if (kayitLogKanal) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#2F3136')
                    .setTitle('🗂️ Kayıt Günlüğü')
                    .setDescription(`${hedefUye} üyesi, ${message.author} tarafından kayıt edildi.`)
                    .setTimestamp();
                
                kayitLogKanal.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error("Kayıt hatası:", error);
            return message.reply("❌ Bir hata oluştu! Botun rolünü Discord ayarlarından en üste taşımayı unutmayın.");
        }
    }
});

// En güvenli yöntem: Railway panelinden okuyacak, koda dokunmuyoruz!
client.login(process.env.TOKEN);

