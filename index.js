import discord
from discord.ext import commands
import json
import os
import random
import time

# Veri tabanı dosyaları
DATA_FILE = "banka.json"
INVITE_FILE = "davet.json"

def veri_yukle(dosya):
    if not os.path.exists(dosya):
        return {}
    with open(dosya, "r", encoding="utf-8") as f:
        try: return json.load(f)
        except json.JSONDecodeError: return {}

def veri_kaydet(dosya, data):
    with open(dosya, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

intents = discord.Intents.default()
intents.message_content = True
intents.members = True
intents.invites = True
bot = commands.Bot(command_prefix=".", intents=intents, help_command=None)

# Davet takibi için geçici hafıza
sunucu_davetleri = {}

def bakiye_kontrol(user_id, data):
    uid = str(user_id)
    if uid not in data:
        data[uid] = {"cash": 0, "butce": 0, "ant": 0, "last_pen": 0, "last_ant": 0}
    for key in ["cash", "butce", "ant", "last_pen", "last_ant"]:
        if key not in data[uid]: data[uid][key] = 0
    return data

def davet_kontrol(user_id, data):
    uid = str(user_id)
    if uid not in data:
        data[uid] = {"gercek": 0, "fake": 0, "ayrildi": 0, "tekrar": 0, "davet eden": None}
    return data

@bot.event
async def on_ready():
    print(f"⚡ Bot giriş yaptı: {bot.user.name}")
    for guild in bot.guilds:
        try: sunucu_davetleri[guild.id] = await guild.invites()
        except: pass

@bot.event
async def on_member_join(member):
    data = veri_yukle(INVITE_FILE)
    guild = member.guild
    eski_davetler = sunucu_davetleri.get(guild.id, [])
    try: yeni_davetler = await guild.invites()
    except: return
    sunucu_davetleri[guild.id] = yeni_davetler

    davet_eden = None
    for old_inv in eski_davetler:
        for new_inv in yeni_davetler:
            if old_inv.code == new_inv.code and new_inv.uses > old_inv.uses:
                davet_eden = old_inv.inviter
                break
    
    if davet_eden and not davet_eden.bot:
        mid = str(member.id)
        data = davet_kontrol(davet_eden.id, data)
        
        # Fake Kontrolü (7 günden taze hesaplar fake sayılır)
        if (discord.utils.utcnow() - member.created_at).days < 7:
            data[str(davet_eden.id)]["fake"] += 1
        else:
            if mid in data and data[mid].get("davet eden") == str(davet_eden.id):
                data[str(davet_eden.id)]["tekrar"] += 1
                data[str(davet_eden.id)]["gercek"] += 1
            else:
                data[str(davet_eden.id)]["gercek"] += 1
        
        data[mid] = davet_kontrol(member.id, data)
        data[mid]["davet eden"] = str(davet_eden.id)
        veri_kaydet(INVITE_FILE, data)

@bot.event
async def on_member_remove(member):
    data = veri_yukle(INVITE_FILE)
    mid = str(member.id)
    if mid in data and data[mid].get("davet eden"):
        d_eden_id = data[mid]["davet eden"]
        if d_eden_id in data:
            data[d_eden_id]["ayrildi"] += 1
            if data[d_eden_id]["gercek"] > 0:
                data[d_eden_id]["gercek"] -= 1
            veri_kaydet(INVITE_FILE, data)

# --- EKONOMİ KOMUTLARI ---
@bot.command(name="bal")
async def bal(ctx):
    data = veri_yukle(DATA_FILE)
    data = bakiye_kontrol(ctx.author.id, data)
    await ctx.send(f"🪙 **{ctx.author.display_name}**, bakiye: **{data[str(ctx.author.id)]['cash']:,}** cash.")

@bot.command(name="send")
async def send(ctx, member: discord.Member = None, miktar: int = None):
    if not member or not miktar or miktar <= 0 or member.id == ctx.author.id:
        return await ctx.send("❌ Hatalı kullanım! Örnek: `.send @üye 500000`")
    data = veri_yukle(DATA_FILE)
    data = bakiye_kontrol(ctx.author.id, data)
    data = bakiye_kontrol(member.id, data)
    if data[str(ctx.author.id)]["cash"] < miktar:
        return await ctx.send("❌ Bakiyeniz yetersiz!")
    data[str(ctx.author.id)]["cash"] -= miktar
    data[str(member.id)]["cash"] += miktar
    veri_kaydet(DATA_FILE, data)
    await ctx.send(f"✅ **{member.display_name}** kullanıcısına **{miktar:,}** cash gönderildi!")

@bot.command(name="paraver")
@commands.has_permissions(administrator=True)
async def paraver(ctx, member: discord.Member = None, miktar: int = None):
    if not member or not miktar: return await ctx.send("❌ Örnek: `.paraver @üye 1000000`")
    data = veri_yukle(DATA_FILE)
    data = bakiye_kontrol(member.id, data)
    data[str(member.id)]["cash"] += miktar
    veri_kaydet(DATA_FILE, data)
    await ctx.send(f"👑 **{member.display_name}** kullanıcısına **{miktar:,}** cash eklendi!")

@bot.command(name="parasil")
@commands.has_permissions(administrator=True)
async def parasil(ctx, member: discord.Member = None, miktar: int = None):
    if not member or not miktar: return await ctx.send("❌ Örnek: `.parasil @üye 500000`")
    data = veri_yukle(DATA_FILE)
    data = bakiye_kontrol(member.id, data)
    data[str(member.id)]["cash"] = max(0, data[str(member.id)]["cash"] - miktar)
    veri_kaydet(DATA_FILE, data)
    await ctx.send(f"📉 **{member.display_name}** hesabından **{miktar:,}** cash silindi!")

@bot.group(name="bütçe", aliases=["butce"], invoke_without_command=True)
async def butce(ctx):
    data = veri_yukle(DATA_FILE)
    data = bakiye_kontrol(ctx.author.id, data)
    await ctx.send(f"📊 **{ctx.author.display_name}**, mevcut kulüp bütçeniz: **{data[str(ctx.author.id)]['butce']:,}** bütçe.")

@butce.command(name="sil")
@commands.has_permissions(administrator=True)
async def butce_sil(ctx, member: discord.Member = None, miktar: int = None):
    if not member or not miktar: return await ctx.send("❌ Örnek: `.bütçe sil @üye 500000`")
    data = veri_yukle(DATA_FILE)
    data = bakiye_kontrol(member.id, data)
    data[str(member.id)]["butce"] = max(0, data[str(member.id)]["butce"] - miktar)
    veri_kaydet(DATA_FILE, data)
    await ctx.send(f"📉 **{member.display_name}** bütçesinden **{miktar:,}** silindi!")

@butce.command(name="ekle")
@commands.has_permissions(administrator=True)
async def butce_ekle(ctx, member: discord.Member = None, miktar: int = None):
    if not member or not miktar: return await ctx.send("❌ Örnek: `.bütçe ekle @üye 500000`")
    data = veri_yukle(DATA_FILE)
    data = bakiye_kontrol(member.id, data)
    data[str(member.id)]["butce"] += miktar
    veri_kaydet(DATA_FILE, data)
    await ctx.send(f"📈 **{member.display_name}** bütçesine **{miktar:,}** eklendi!")

# --- OYUN & SAATLİK KOMUTLAR (.pen ve .ant) ---
@bot.command(name="pen")
async def pen(ctx):
    data = veri_yukle(DATA_FILE)
    data = bakiye_kontrol(ctx.author.id, data)
    su an = int(time.time())
    
    if su_an - data[str(ctx.author.id)]["last_pen"] < 3600:
        kalan = 3600 - (su_an - data[str(ctx.author.id)]["last_pen"])
        return await ctx.send(f"⏱️ Bu komut saatte 1 kez kullanılabilir! Kalan süre: **{kalan//60}** dakika.")
        
    sonuclar = ["⚽ GOL! Muhteşem bir vuruş!", "🥅 DİREK! Top direkten döndü!", "🏟️ AUT! Top dışarı çıktı!", "🧤 KALECİ! Kaleci köşeden çıkardı!"]
    secilen = random.choice(sonuclar)
    
    data[str(ctx.author.id)]["last_pen"] = su_an
    if "GOL" in secilen:
        data[str(ctx.author.id)]["cash"] += 50000  # Gol ödülü (İstersen değiştir)
        secilen += " (+50,000 cash)"
        
    veri_kaydet(DATA_FILE, data)
    await ctx.send(f"⚽ **{ctx.author.display_name}** penaltı kullandı...\n👉 **{secilen}**")

@bot.command(name="ant")
async def ant(ctx):
    data = veri_yukle(DATA_FILE)
    data = bakiye_kontrol(ctx.author.id, data)
    su_an = int(time.time())
    
    if su_an - data[str(ctx.author.id)]["last_ant"] < 3600:
        kalan = 3600 - (su_an - data[str(ctx.author.id)]["last_ant"])
        return await ctx.send(f"⏱️ Antrenman saatte 1 kez yapılabilir! Kalan süre: **{kalan//60}** dakika.")
        
    data[str(ctx.author.id)]["last_ant"] = su_an
    data[str(ctx.author.id)]["ant"] += 1
    
    mevcut_ant = data[str(ctx.author.id)]["ant"]
    
    if mevcut_ant >= 10:
        data[str(ctx.author.id)]["ant"] = 0
        data[str(ctx.author.id)]["cash"] += 200000  # 10/10 olunca verilecek ödül
        await ctx.send(f"🏃‍♂️ **{ctx.author.display_name}**, 10/10 antrenmanı tamamladın ve bittikten sonra sıfırlandı! 🎉 **+200,000 cash** kazandın!")
    else:
        await ctx.send(f"🏃‍♂️ **{ctx.author.display_name}**, antrenman yapıldı! İlerleme: **{mevcut_ant}/10**")
        
    veri_kaydet(DATA_FILE, data)

# --- DAVET SİSTEMLERİ (.davet, .davetsil, .davetal, .davetsirala) ---
@bot.command(name="davet")
async def davet(ctx, member: discord.Member = None):
    hedef = member or ctx.author
    data = veri_yukle(INVITE_FILE)
    data = davet_kontrol(hedef.id, data)
    
    u_data = data[str(hedef.id)]
    embed = discord.Embed(title=f"✉️ {hedef.display_name} Davet İstatistikleri", color=discord.Color.blue())
    embed.add_field(name="✅ Gerçek", value=f"**{u_data['gercek']}**", inline=True)
    embed.add_field(name="❌ Fake", value=f"**{u_data['fake']}**", inline=True)
    embed.add_field(name="🚪 Ayrıldı", value=f"**{u_data['ayrildi']}**", inline=True)
    embed.add_field(name="🔄 Yeniden Girdi", value=f"**{u_data['tekrar']}**", inline=True)
    await ctx.send(embed=embed)

@bot.command(name="davetsil")
@commands.has_permissions(administrator=True)
async def davetsil(ctx, member: discord.Member = None, miktar: int = None):
    if not member or not miktar: return await ctx.send("❌ Örnek: `.davetsil @üye 5`")
    data = veri_yukle(INVITE_FILE)
    data = davet_kontrol(member.id, data)
    data[str(member.id)]["gercek"] = max(0, data[str(member.id)]["gercek"] - miktar)
    veri_kaydet(INVITE_FILE, data)
    await ctx.send(f"✅ **{member.display_name}** kullanıcısının gerçek davet sayısından **{miktar}** adet silindi.")

@bot.command(name="davetal")
@commands.has_permissions(administrator=True)
async def davetal(ctx, member: discord.Member = None, miktar: int = None):
    if not member or not miktar: return await ctx.send("❌ Örnek: `.davetal @üye 5`")
    data = veri_yukle(INVITE_FILE)
    data = davet_kontrol(member.id, data)
    data[str(member.id)]["gercek"] += miktar
    veri_kaydet(INVITE_FILE, data)
    await ctx.send(f"✅ **{member.display_name}** kullanıcısına **{miktar}** adet gerçek davet eklendi.")

@bot.command(name="davetsırala", aliases=["davetsirala"])
async def davetsirala(ctx):
    data = veri_yukle(INVITE_FILE)
    # Sadece gerçek daveti 0'dan büyük olanları ve sunucuda olanları sırala
    sirali = sorted(data.items(), key=lambda item: item[1].get("gercek", 0), reverse=True)
    
    embed = discord.Embed(title=f"🏆 {ctx.guild.name} Davet Sıralaması (İlk 10)", color=discord.Color.gold())
    
    sayac = 0
    for user_id, info in sirali:
        if sayac >= 10: break
        member = ctx.guild.get_member(int(user_id))
        if member:
            sayac += 1
            embed.add_field(name=f"{sayac}. {member.display_name}", value=f"Gerçek: **{info['gercek']}** | Fake: {info['fake']} | Ayrılan: {info['ayrildi']}", inline=False)
            
    if sayac == 0:
        embed.description = "Henüz davet verisi bulunmuyor."
        
    await ctx.send(embed=embed)

# --- YARDIM ---
@bot.command(name="yardım", aliases=["yardim"])
async def yardim(ctx):
    embed = discord.Embed(title="💰 Ekonomi & Lig Sistemi Komutları", color=discord.Color.green())
    embed.add_field(name="⚽ Lig & Eğlence", value="`.pen` -> Penaltı atarsın (Saatlik)\n`.ant` -> Antrenman yaparsın (10/1 aşamalı, saatlik)", inline=False)
    embed.add_field(name="✉️ Davet Sistemi", value="`.davet [@üye]` -> Davet istatistiklerini listeler\n`.davetsirala` -> Sunucu ilk 10 davet liderini listeler", inline=False)
    embed.add_field(name="🪙 Ekonomi", value="`.bal` -> Nakit gösterir\n`.send @üye [miktar]` -> Para transferi\n`.bütçe` -> Kulüp bütçesini gösterir", inline=False)
    
    if ctx.author.guild_permissions.administrator:
        embed.add_field(name="👑 Owner / Yönetici Yetkileri", value="`.paraver` / `.parasil` -> Cash yönetimi\n`.bütçe ekle` / `.bütçe sil` -> Bütçe yönetimi\n`.davetal` / `.davetsil` -> Davet ekleme/silme", inline=False)
    await ctx.send(embed=embed)

@yetki_hatasi.error  # Genel yetki kontrolü için
async def yetki_kontrol_hatasi(ctx, error):
    if isinstance(error, commands.MissingPermissions):
        await ctx.send("❌ Bu komutu kullanmak için 'Yönetici' yetkiniz olmalıdır!")

bot.run("YOUR_DISCORD_BOT_TOKEN")
                   
