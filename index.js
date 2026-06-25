const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers 
    ] 
});

let db = fs.existsSync('./db.json') ? JSON.parse(fs.readFileSync('./db.json', 'utf8')) : {};
function saveDb() { fs.writeFileSync('./db.json', JSON.stringify(db, null, 2)); }

client.on('ready', async () => {
    console.log(`${client.user.tag} hazır! Tüm üyeler çekiliyor...`);
    client.guilds.cache.forEach(async (guild) => {
        await guild.members.fetch();
    });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const args = message.content.split(' ');
    const komut = args[0];

    // 1. TAKIM KURMA: .takimkur TakımAdı
    if (komut === '.takimkur') {
        if (!args[1]) return message.reply("Takım adı gir!");
        db[args[1]] = { kadro: [] };
        saveDb();
        message.reply(`✅ **${args[1]}** kuruldu.`);
    }

    // 2. KAYIT PANELİNİ KUR: .panelkur
    if (komut === '.panelkur') {
        const embed = new EmbedBuilder()
            .setTitle("⚽ Lig Kayıt Paneli")
            .setDescription("Takım butonlarına basarak kadroya katıl.");
        
        const row = new ActionRowBuilder();
        Object.keys(db).forEach(takim => {
            row.addComponents(
                new ButtonBuilder().setCustomId(`kayit_${takim}`).setLabel(takim).setStyle(ButtonStyle.Primary)
            );
        });
        message.channel.send({ embeds: [embed], components: [row] });
    }

    // 3. KADRO BAK: .kadro TakımAdı
    if (komut === '.kadro') {
        const data = db[args[1]];
        if (!data) return message.reply("Takım bulunamadı!");
        const liste = data.kadro.length > 0 ? data.kadro.map(o => `• ${o.ad}`).join('\n') : "Henüz kimse yok.";
        message.reply(`📋 **${args[1]} Kadrosu:**\n${liste}`);
    }
});

// 4. BUTON İLE OTOMATİK KAYIT
client.on('interactionCreate', async i => {
    if (!i.isButton()) return;
    if (i.customId.startsWith('kayit_')) {
        const takim = i.customId.split('_')[1];
        
        // Zaten kayıtlı mı kontrol et
        if (db[takim].kadro.find(o => o.id === i.member.id)) {
            return i.reply({ content: "Zaten bu takımdasın!", ephemeral: true });
        }

        db[takim].kadro.push({ ad: i.member.displayName, id: i.member.id });
        saveDb();
        i.reply({ content: `✅ **${takim}** kadrosuna eklendin!`, ephemeral: true });
    }
});

// 5. ÇIKANLARI SİL
client.on('guildMemberRemove', member => {
    for (let t in db) {
        db[t].kadro = db[t].kadro.filter(o => o.id !== member.id);
    }
    saveDb();
});

client.login(process.env.TOKEN);
