const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

let db = JSON.parse(fs.readFileSync('./db.json', 'utf8'));
function saveDb() { fs.writeFileSync('./db.json', JSON.stringify(db, null, 2)); }

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const args = message.content.split(' ');

    // 1. TAKIM KURMA
    if (args[0] === '!takimkur') {
        const isim = args[1];
        db[isim] = { baskan: message.author.id, kadro: [] };
        saveDb();
        message.reply(`✅ **${isim}** kuruldu.`);
    }

    // 2. OYUNCU EKLEME PANELİ (Butonlu)
    if (args[0] === '!ekle') {
        const oyuncu = message.mentions.members.first();
        const takim = args[2];
        if (!oyuncu || !db[takim]) return message.reply("❌ !ekle @kullanıcı TakımAdı");
        
        const row1 = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId(`mevki_${oyuncu.id}_${takim}`).setPlaceholder('Mevki Seç...')
                .addOptions([{label:'GK',value:'GK'},{label:'Stoper',value:'Stoper'},{label:'Forvet',value:'Forvet'}])
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`durum_ilk11_${oyuncu.id}_${takim}`).setLabel('İlk 11').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`durum_yedek_${oyuncu.id}_${takim}`).setLabel('Yedek').setStyle(ButtonStyle.Secondary)
        );
        message.reply({ content: `⚽ **${oyuncu.displayName}** için mevkii ve durumu seç:`, components: [row1, row2] });
    }

    // 3. KADRO GÖRÜNTÜLEME
    if (args[0] === '!kadro') {
        const data = db[args[1]];
        if (!data) return message.reply("Takım yok!");
        const k = data.kadro.map(o => `• ${o.ad} (${o.mevki} - ${o.durum})`).join('\n');
        message.reply(`📋 **${args[1]} Kadrosu:**\n${k}`);
    }

    // 4. MAÇ SİMÜLASYONU
    if (args[0] === '!mac') {
        const ev = args[1], dep = args[2];
        let d = 0, evG = 0, depG = 0;
        const msg = await message.channel.send(`🏟️ ${ev} vs ${dep} başladı!`);
        const timer = setInterval(() => {
            d += 15;
            if (Math.random() > 0.5) { evG++; } else { depG++; }
            msg.edit(`⚽ Dakika ${d}: Skor ${evG} - ${depG}`);
            if (d >= 90) { clearInterval(timer); msg.edit(`🏁 Sonuç: ${ev} ${evG} - ${depG} ${dep}`); }
        }, 3000);
    }
});

// BUTON TIKLAMALARI
client.on('interactionCreate', async i => {
    if (!i.isStringSelectMenu() && !i.isButton()) return;
    const parts = i.customId.split('_');
    const type = parts[0]; 
    const val = type === 'mevki' ? i.values[0] : parts[1];
    
    // Geçici bir yere yazıp butonla birleştirebilirsin, şimdilik basit:
    i.reply({ content: `✅ ${val} kaydedildi!`, ephemeral: true });
    // Not: Buraya mevki ve durumu JSON'a ekleyen mantığı ekleyeceksin.
});

client.login(process.env.TOKEN);
