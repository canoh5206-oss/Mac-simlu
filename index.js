const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] 
});

let db = fs.existsSync('./db.json') ? JSON.parse(fs.readFileSync('./db.json', 'utf8')) : {};
function saveDb() { fs.writeFileSync('./db.json', JSON.stringify(db, null, 2)); }

// Buraya sunucundaki rol isimlerini aynen yaz
const takimRolleri = ['Fenerbahçe', 'Galatasaray', 'Beşiktaş', 'Trabzonspor']; 

client.on('interactionCreate', async i => {
    if (!i.isButton() || i.customId !== 'otomatik_kayit') return;

    // Üyeyi çek (Sunucudaki 300 kişiyi otomatik tarar)
    const uye = i.member;
    const bulunanTakim = takimRolleri.find(rolIsmi => uye.roles.cache.some(r => r.name === rolIsmi));

    if (!bulunanTakim) {
        return i.reply({ content: "❌ Üzerinde kayıtlı bir takım rolü yok!", ephemeral: true });
    }

    if (!db[bulunanTakim]) db[bulunanTakim] = { kadro: [] };

    // Eğer zaten kayıtlı değilse ekle
    if (!db[bulunanTakim].kadro.find(o => o.id === uye.id)) {
        db[bulunanTakim].kadro.push({ ad: uye.displayName, id: uye.id });
        saveDb();
        i.reply({ content: `✅ **${bulunanTakim}** kadrosuna başarıyla eklendin!`, ephemeral: true });
    } else {
        i.reply({ content: "Zaten kadroda kayıtlısın.", ephemeral: true });
    }
});

client.on('messageCreate', async message => {
    if (message.content === '.panel') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('otomatik_kayit').setLabel('Kadroya Gir').setStyle(ButtonStyle.Success)
        );
        message.channel.send({ content: "Kadroya otomatik girmek için tıkla:", components: [row] });
    }
});

client.login(process.env.TOKEN);
