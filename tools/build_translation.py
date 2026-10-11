#!/usr/bin/env python3
"""Build the translation pages in three languages from one table.

    python3 tools/build_translation.py

Writes docs/translation/index.html (English), docs/translation/th/index.html
(Thai) and docs/translation/my/index.html (Burmese). One source, so the three
pages say the same thing.
"""

from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
ORIGIN = "https://hongdam.net"

PAGES = {"en": "/translation/", "th": "/translation/th/", "my": "/translation/my/"}
SWITCH = [("en", "English"), ("th", "ไทย"), ("my", "မြန်မာ")]

W = {
    "en": {
        "title": "Translation — Thai, English, Burmese · Hongdam",
        "desc": "Hongdam translates papers, business text and conversations between Thai, English and Burmese. Chiang Rai and Chiang Mai in person; by phone or video anywhere.",
        "h1": "Translation",
        "sub": "Thai · English · Burmese",
        "lede": "Papers, business text and conversations, between Thai, English and Burmese. In person in Chiang Rai and Chiang Mai; by phone or video anywhere.",
        "pairs_h": "Languages",
        "pairs": ["Thai ⇄ English", "Thai ⇄ Burmese", "English ⇄ Burmese"],
        "pairs_note": "Burmese comes back in Unicode Myanmar script. A Zawgyi copy is there on request, for phones still set to it.",
        "papers_h": "Papers",
        "papers": [
            "Passport and ID pages", "Pink card and Certificate of Identity (CI)",
            "House registration (tabien baan)", "Birth, marriage and divorce certificates",
            "Police clearance", "Bank letters and statements",
            "Employment contracts and payslips", "Work-permit papers",
            "School transcripts and diplomas", "Medical records and certificates",
            "Leases and rental agreements", "Letters from offices, schools and hospitals",
        ],
        "biz_h": "Business",
        "biz": [
            "Menus, signs and price boards", "Product labels and packaging",
            "Staff notices, workplace rules and safety signs, for Burmese-speaking staff",
            "Contracts set in two languages side by side", "Websites and apps, built or translated by the studio",
            "LINE, Facebook and TikTok posts",
        ],
        "talk_h": "Interpreting",
        "talk": [
            "By phone or video, from anywhere",
            "In person in Chiang Rai and Chiang Mai",
            "Immigration and the provincial employment office",
            "Hospital and clinic visits",
            "Police, landlords and schools",
            "Job interviews and staff training",
        ],
        "stamp_h": "The stamp",
        "stamp": "A translated page carries the Hongdam stamp: the date, the translator's name, and a QR code that opens hongdam.net/services. We don't notarize. On request we confirm a translation is ours.",
        "stamp_alt": "Round Hongdam translation stamp with blanks for the date and the translator's name, and a QR code.",
        "how_h": "How it works",
        "how": [
            ("Photos", "A photo or a scan of each page. A phone photo works when every line can be read."),
            ("Price", "In writing, for the pages, the words or the hours, before any work starts."),
            ("Delivery", "A PDF by email or LINE, and as stamped paper if you ask for it."),
        ],
        "form_h": "Price",
        "f_name": "Name", "f_email": "Email", "f_from": "From", "f_to": "Into",
        "f_kind": "What it is", "f_kinds": ["Papers", "Business text", "Interpreting", "Something else"],
        "f_pages": "Pages, words or hours", "f_pages_ph": "For example: 3 pages",
        "f_msg": "Anything else", "f_msg_ph": "What the papers are for, and the date you need them.",
        "f_send": "Send", "f_hp": "Leave this empty",
        "langs": ["Thai", "English", "Burmese"],
        "s_need": "Email, please.", "s_sending": "Sending…",
        "s_ok": "Sent. A price comes back to that address.", "s_err": "Could not send that just now. Email nan@motdang.net instead.",
        "or_mail": "Or email", "home": "hongdam.net",
    },
    "th": {
        "title": "แปลเอกสาร ไทย อังกฤษ พม่า · หงส์ดำ",
        "desc": "หงส์ดำแปลเอกสาร ข้อความธุรกิจ และล่ามสนทนา ระหว่างภาษาไทย อังกฤษ และพม่า ล่ามตัวจริงที่เชียงรายและเชียงใหม่ ทางโทรศัพท์หรือวิดีโอได้ทุกที่",
        "h1": "แปลภาษา",
        "sub": "ไทย · อังกฤษ · พม่า",
        "lede": "เอกสาร ข้อความธุรกิจ และล่าม ระหว่างภาษาไทย อังกฤษ และพม่า ล่ามตัวจริงที่เชียงรายและเชียงใหม่ ทางโทรศัพท์หรือวิดีโอได้ทุกที่",
        "pairs_h": "ภาษา",
        "pairs": ["ไทย ⇄ อังกฤษ", "ไทย ⇄ พม่า", "อังกฤษ ⇄ พม่า"],
        "pairs_note": "ภาษาพม่าส่งเป็นอักษรเมียนมายูนิโค้ด ถ้าโทรศัพท์ยังใช้ Zawgyi ขอฉบับ Zawgyi ได้",
        "papers_h": "เอกสาร",
        "papers": [
            "หน้าหนังสือเดินทางและบัตรประชาชน", "บัตรชมพูและเอกสาร CI",
            "ทะเบียนบ้าน", "สูติบัตร ทะเบียนสมรส ทะเบียนหย่า",
            "หนังสือรับรองความประพฤติจากตำรวจ", "หนังสือรับรองและรายการเดินบัญชีธนาคาร",
            "สัญญาจ้างและสลิปเงินเดือน", "เอกสารใบอนุญาตทำงาน",
            "ใบแสดงผลการเรียนและวุฒิบัตร", "ประวัติการรักษาและใบรับรองแพทย์",
            "สัญญาเช่า", "จดหมายจากหน่วยงาน โรงเรียน และโรงพยาบาล",
        ],
        "biz_h": "ธุรกิจ",
        "biz": [
            "เมนู ป้าย และป้ายราคา", "ฉลากสินค้าและบรรจุภัณฑ์",
            "ประกาศพนักงาน กฎในที่ทำงาน และป้ายความปลอดภัย สำหรับพนักงานที่พูดพม่า",
            "สัญญาสองภาษาเทียบกันในหน้าเดียว", "เว็บไซต์และแอป ที่สตูดิโอสร้างหรือแปล",
            "โพสต์ LINE, Facebook และ TikTok",
        ],
        "talk_h": "ล่าม",
        "talk": [
            "ทางโทรศัพท์หรือวิดีโอ จากที่ไหนก็ได้",
            "ไปด้วยตัวเองที่เชียงรายและเชียงใหม่",
            "ตรวจคนเข้าเมือง และสำนักงานจัดหางานจังหวัด",
            "โรงพยาบาลและคลินิก",
            "ตำรวจ เจ้าของบ้าน และโรงเรียน",
            "สัมภาษณ์งานและอบรมพนักงาน",
        ],
        "stamp_h": "ตราประทับ",
        "stamp": "หน้าที่แปลแล้วมีตราหงส์ดำ วันที่ ชื่อผู้แปล และคิวอาร์โค้ดที่เปิด hongdam.net/services เราไม่รับรองโนตารี เมื่อมีผู้สอบถาม เรายืนยันได้ว่างานแปลนั้นเป็นของเรา",
        "stamp_alt": "ตราประทับงานแปลหงส์ดำ ทรงกลม มีช่องวันที่และชื่อผู้แปล และคิวอาร์โค้ด",
        "how_h": "ขั้นตอน",
        "how": [
            ("รูปถ่าย", "รูปถ่ายหรือสแกนทุกหน้า รูปจากโทรศัพท์ใช้ได้ถ้าอ่านออกทุกบรรทัด"),
            ("ราคา", "เป็นลายลักษณ์อักษร ตามจำนวนหน้า คำ หรือชั่วโมง ก่อนเริ่มงาน"),
            ("ส่งคืน", "เป็น PDF ทางอีเมลหรือ LINE และฉบับกระดาษประทับตราถ้าต้องการ"),
        ],
        "form_h": "ราคา",
        "f_name": "ชื่อ", "f_email": "อีเมล", "f_from": "จากภาษา", "f_to": "เป็นภาษา",
        "f_kind": "งานแบบไหน", "f_kinds": ["เอกสาร", "ข้อความธุรกิจ", "ล่าม", "อื่น ๆ"],
        "f_pages": "จำนวนหน้า คำ หรือชั่วโมง", "f_pages_ph": "เช่น 3 หน้า",
        "f_msg": "รายละเอียดอื่น", "f_msg_ph": "เอกสารใช้ทำอะไร และต้องการวันไหน",
        "f_send": "ส่ง", "f_hp": "เว้นว่างช่องนี้",
        "langs": ["ไทย", "อังกฤษ", "พม่า"],
        "s_need": "ขออีเมลด้วย", "s_sending": "กำลังส่ง…",
        "s_ok": "ส่งแล้ว ราคาจะส่งกลับไปที่อีเมลนั้น", "s_err": "ส่งไม่ได้ตอนนี้ อีเมลมาที่ nan@motdang.net แทนได้",
        "or_mail": "หรืออีเมล", "home": "hongdam.net",
    },
    "my": {
        "title": "ဘာသာပြန် — ထိုင်း၊ အင်္ဂလိပ်၊ မြန်မာ · Hongdam",
        "desc": "Hongdam သည် ထိုင်း၊ အင်္ဂလိပ်နှင့် မြန်မာဘာသာများကြား စာရွက်စာတမ်း၊ လုပ်ငန်းသုံးစာနှင့် စကားပြန် လုပ်ပေးပါသည်။ ချင်းရိုင်နှင့် ချင်းမိုင်တွင် လူကိုယ်တိုင်၊ ဖုန်း သို့မဟုတ် ဗီဒီယိုဖြင့် မည်သည့်နေရာမဆို။",
        "h1": "ဘာသာပြန်",
        "sub": "ထိုင်း · အင်္ဂလိပ် · မြန်မာ",
        "lede": "စာရွက်စာတမ်း၊ လုပ်ငန်းသုံးစာနှင့် စကားပြန်၊ ထိုင်း၊ အင်္ဂလိပ်နှင့် မြန်မာဘာသာများကြား။ ချင်းရိုင်နှင့် ချင်းမိုင်တွင် လူကိုယ်တိုင်၊ ဖုန်း သို့မဟုတ် ဗီဒီယိုဖြင့် မည်သည့်နေရာမဆို။",
        "pairs_h": "ဘာသာစကား",
        "pairs": ["ထိုင်း ⇄ အင်္ဂလိပ်", "ထိုင်း ⇄ မြန်မာ", "အင်္ဂလိပ် ⇄ မြန်မာ"],
        "pairs_note": "မြန်မာစာကို ယူနီကုဒ်ဖြင့် ပြန်ပို့ပါသည်။ ဖုန်းတွင် ဇော်ဂျီ သုံးနေသေးပါက ဇော်ဂျီမူကို တောင်းနိုင်ပါသည်။",
        "papers_h": "စာရွက်စာတမ်း",
        "papers": [
            "နိုင်ငံကူးလက်မှတ်နှင့် မှတ်ပုံတင် စာမျက်နှာများ", "ပန်းရောင်ကတ်နှင့် CI (Certificate of Identity)",
            "အိမ်ထောင်စုစာရင်း (တဘီယန်ဘာန်)", "မွေးစာရင်း၊ လက်ထပ်စာချုပ်နှင့် ကွာရှင်းစာချုပ်",
            "ရဲ၏ ပြစ်မှုကင်းရှင်းကြောင်း ထောက်ခံစာ", "ဘဏ်ထောက်ခံစာနှင့် ဘဏ်စာရင်းရှင်းတမ်း",
            "အလုပ်ခန့်စာချုပ်နှင့် လစာစလစ်", "အလုပ်ပါမစ် စာရွက်များ",
            "ကျောင်းအမှတ်စာရင်းနှင့် အောင်လက်မှတ်", "ဆေးမှတ်တမ်းနှင့် ဆေးထောက်ခံစာ",
            "အိမ်ငှားစာချုပ်", "ရုံး၊ ကျောင်းနှင့် ဆေးရုံမှ စာများ",
        ],
        "biz_h": "လုပ်ငန်းသုံး",
        "biz": [
            "မီနူး၊ ဆိုင်းဘုတ်နှင့် စျေးနှုန်းဘုတ်", "ပစ္စည်းတံဆိပ်နှင့် ထုပ်ပိုးမှု",
            "မြန်မာဝန်ထမ်းများအတွက် ဝန်ထမ်းကြေညာချက်၊ လုပ်ငန်းခွင်စည်းကမ်းနှင့် ဘေးကင်းရေး ဆိုင်းဘုတ်",
            "ဘာသာနှစ်မျိုး ယှဉ်တွဲထားသော စာချုပ်", "စတူဒီယိုက တည်ဆောက် သို့မဟုတ် ဘာသာပြန်သော ဝက်ဘ်ဆိုက်နှင့် အက်ပ်",
            "LINE၊ Facebook နှင့် TikTok ပို့စ်များ",
        ],
        "talk_h": "စကားပြန်",
        "talk": [
            "ဖုန်း သို့မဟုတ် ဗီဒီယိုဖြင့် မည်သည့်နေရာမှမဆို",
            "ချင်းရိုင်နှင့် ချင်းမိုင်တွင် လူကိုယ်တိုင်",
            "လူဝင်မှုကြီးကြပ်ရေးရုံးနှင့် ခရိုင် အလုပ်အကိုင်ရုံး",
            "ဆေးရုံနှင့် ဆေးခန်း",
            "ရဲစခန်း၊ အိမ်ရှင်နှင့် ကျောင်း",
            "အလုပ်အင်တာဗျူးနှင့် ဝန်ထမ်းသင်တန်း",
        ],
        "stamp_h": "တံဆိပ်",
        "stamp": "ဘာသာပြန်ထားသော စာမျက်နှာတွင် Hongdam တံဆိပ်၊ ရက်စွဲ၊ ဘာသာပြန်သူ၏အမည်နှင့် hongdam.net/services ကို ဖွင့်သော QR ကုဒ် ပါပါသည်။ ကျွန်ုပ်တို့ နိုတာရီ အတည်ပြုချက် မလုပ်ပါ။ မေးမြန်းပါက ဘာသာပြန်သည် ကျွန်ုပ်တို့၏ လက်ရာ ဟုတ်မဟုတ် အတည်ပြုပေးပါမည်။",
        "stamp_alt": "Hongdam ဘာသာပြန် တံဆိပ်ဝိုင်း၊ ရက်စွဲနှင့် ဘာသာပြန်သူအမည် ကွက်လပ်များနှင့် QR ကုဒ်။",
        "how_h": "လုပ်ပုံ",
        "how": [
            ("ဓာတ်ပုံ", "စာမျက်နှာတိုင်း၏ ဓာတ်ပုံ သို့မဟုတ် စကင်ဖိုင်။ စာကြောင်းတိုင်း ဖတ်၍ရလျှင် ဖုန်းဓာတ်ပုံဖြင့် ရပါသည်။"),
            ("စျေးနှုန်း", "စာဖြင့်၊ စာမျက်နှာ၊ စာလုံး သို့မဟုတ် နာရီအလိုက်၊ အလုပ်မစမီ။"),
            ("ပြန်ပို့ခြင်း", "အီးမေးလ် သို့မဟုတ် LINE ဖြင့် PDF၊ တောင်းဆိုပါက တံဆိပ်တုံးထားသော စာရွက်မူ။"),
        ],
        "form_h": "စျေးနှုန်း",
        "f_name": "အမည်", "f_email": "အီးမေးလ်", "f_from": "မူရင်းဘာသာ", "f_to": "ပြန်လိုသည့်ဘာသာ",
        "f_kind": "အမျိုးအစား", "f_kinds": ["စာရွက်စာတမ်း", "လုပ်ငန်းသုံးစာ", "စကားပြန်", "အခြား"],
        "f_pages": "စာမျက်နှာ၊ စာလုံး သို့မဟုတ် နာရီ", "f_pages_ph": "ဥပမာ - ၃ မျက်နှာ",
        "f_msg": "အခြားအချက်များ", "f_msg_ph": "စာရွက်များကို ဘာအတွက် သုံးမည်နှင့် မည်သည့်ရက်တွင် လိုအပ်သည်။",
        "f_send": "ပို့မည်", "f_hp": "ဤနေရာကို ဗလာထားပါ",
        "langs": ["ထိုင်း", "အင်္ဂလိပ်", "မြန်မာ"],
        "s_need": "အီးမေးလ် ထည့်ပေးပါ။", "s_sending": "ပို့နေသည်…",
        "s_ok": "ပို့ပြီးပါပြီ။ စျေးနှုန်းကို ထိုအီးမေးလ်သို့ ပြန်ပို့ပါမည်။", "s_err": "ယခု မပို့နိုင်ပါ။ nan@motdang.net သို့ အီးမေးလ် ပို့ပါ။",
        "or_mail": "သို့မဟုတ် အီးမေးလ်", "home": "hongdam.net",
    },
}

CSS = """
  .sub{display:block; font-family:"Avenir Next","Segoe UI",system-ui,"Thonburi","Noto Sans Thai","Noto Sans Myanmar","Myanmar Sangam MN","Myanmar Text",sans-serif; font-size:.42em; color:var(--gold-deep); font-weight:500; margin-top:10px; letter-spacing:.04em}
  .switch{display:flex; gap:10px; flex-wrap:wrap; margin:18px 0 6px}
  .switch a{border:1px solid var(--line); border-radius:999px; padding:6px 16px; font-size:16px}
  .switch a[aria-current]{background:var(--gold); color:var(--lacquer); border-color:var(--gold)}
  section{margin-top:52px}
  h2{margin-bottom:16px}
  .pairs{display:flex; flex-wrap:wrap; gap:12px}
  .pairs span{background:var(--lacquer-2); border:1px solid var(--line); border-radius:10px; padding:12px 18px; font-size:20px; color:var(--gold)}
  .note{margin-top:14px; max-width:62ch; color:var(--cream-dim); font-size:16px}
  .cols{display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:18px}
  .col{background:var(--lacquer-2); border:1px solid var(--line); border-radius:12px; padding:20px}
  .col h2{font-size:21px; color:var(--gold)}
  .col ul{list-style:none}
  .col li{padding:7px 0; border-top:1px solid var(--line); color:var(--cream-dim); font-size:16px}
  .col li:first-child{border-top:0}
  .stamp{display:grid; grid-template-columns:minmax(0,180px) 1fr; gap:24px; align-items:center; max-width:720px}
  .stamp img{width:100%; height:auto; background:var(--cream); border-radius:50%; padding:6px}
  .stamp p{color:var(--cream-dim)}
  .steps{display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:18px; counter-reset:s}
  .steps div{counter-increment:s; border-top:2px solid var(--gold-deep); padding-top:14px}
  .steps b{display:block; color:var(--cream); font-size:18px}
  .steps b::before{content:counter(s) ". "; color:var(--gold)}
  .steps p{color:var(--cream-dim); font-size:16px; margin-top:4px}
  form{max-width:640px; position:relative}
  .row{display:grid; grid-template-columns:1fr 1fr; gap:0 16px}
  .mail{margin-top:18px; font-size:16px; color:var(--cream-dim)}
  footer{max-width:980px; margin:0 auto; padding:0 16px 48px; font-size:15px; color:var(--cream-dim)}
  html[lang="my"] body{font-family:"Noto Sans Myanmar","Myanmar Sangam MN","Myanmar Text","Pyidaungsu",sans-serif; line-height:1.95}
  html[lang="my"] h1,html[lang="my"] h2{font-family:inherit; line-height:1.5}
  html[lang="my"] label{text-transform:none; letter-spacing:0; font-size:15px}
  @media (max-width:560px){.stamp{grid-template-columns:1fr}.stamp img{max-width:180px}.row{grid-template-columns:1fr}}
"""


def e(s):
    return escape(s, quote=True)


def page(lang):
    t = W[lang]
    url = ORIGIN + PAGES[lang]
    alts = "\n".join(f'<link rel="alternate" hreflang="{k}" href="{ORIGIN}{v}">' for k, v in PAGES.items())
    alts += f'\n<link rel="alternate" hreflang="x-default" href="{ORIGIN}{PAGES["en"]}">'
    switch = "".join(
        f'<a href="{PAGES[k]}" hreflang="{k}" lang="{k}"' + (' aria-current="page"' if k == lang else "") + f">{e(n)}</a>"
        for k, n in SWITCH)
    lis = lambda xs: "".join(f"<li>{e(x)}</li>" for x in xs)
    opts = lambda xs: "".join(f"<option>{e(x)}</option>" for x in xs)
    steps = "".join(f"<div><b>{e(h)}</b><p>{e(p)}</p></div>" for h, p in t["how"])
    pairs = "".join(f"<span>{e(p)}</span>" for p in t["pairs"])
    msgs = {k: t[k] for k in ("s_need", "s_sending", "s_ok", "s_err")}
    import json
    ld = json.dumps({
        "@context": "https://schema.org",
        "@type": "Service",
        "name": t["title"],
        "url": url,
        "serviceType": "Translation and interpreting",
        "inLanguage": lang,
        "availableLanguage": ["th", "en", "my"],
        "areaServed": ["Chiang Rai Province", "Chiang Mai Province", "Thailand"],
        "provider": {"@id": "https://hongdam.net/#org"},
        "isPartOf": {"@id": "https://hongdam.net/#site"},
    }, ensure_ascii=False, indent=1)
    l0, l1, l2 = t["langs"]
    return f"""<!DOCTYPE html>
<html lang="{lang}" class="notranslate" translate="no">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(t["title"])}</title>
<meta name="description" content="{e(t["desc"])}">
<meta name="theme-color" content="#171009">
<meta name="color-scheme" content="dark">
<link rel="icon" href="/assets/favicon.svg">
<link rel="canonical" href="{url}">
{alts}
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{e(t["title"])}">
<meta property="og:description" content="{e(t["desc"])}">
<meta property="og:image" content="https://hongdam.net/assets/card.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/assets/rt.css">
<style>{CSS}</style>
<meta name="google" content="notranslate">
<meta name="robots" content="notranslate">
<script>if(/[.]translate[.]goog$/.test(location.hostname))location.replace("https://"+location.hostname.slice(0,-15).replace(/--/g,"~").replace(/-/g,".").replace(/~/g,"-")+location.pathname+location.search.replace(/([?&])_x_tr_[^&]*/g,"$1").replace(/[?&]+$/,"").replace(/[?]&+/,"?")+location.hash)</script>
<script type="application/ld+json">
{ld}
</script>
</head>
<body>
<header class="top">
  <a class="mark" href="/">HONGDAM <span lang="th">หงส์ดำ</span></a>
  <nav><a href="/translation/" aria-current="page">Translation</a><a href="/own">Own</a><a href="/redteam">Red team</a><a href="/market">Market</a></nav>
</header>
<main>
  <h1>{e(t["h1"])}<span class="sub">{e(t["sub"])}</span></h1>
  <nav class="switch" aria-label="Language">{switch}</nav>
  <p class="lede">{e(t["lede"])}</p>

  <section>
    <h2>{e(t["pairs_h"])}</h2>
    <div class="pairs">{pairs}</div>
    <p class="note">{e(t["pairs_note"])}</p>
  </section>

  <section class="cols">
    <div class="col"><h2>{e(t["papers_h"])}</h2><ul>{lis(t["papers"])}</ul></div>
    <div class="col"><h2>{e(t["biz_h"])}</h2><ul>{lis(t["biz"])}</ul></div>
    <div class="col"><h2>{e(t["talk_h"])}</h2><ul>{lis(t["talk"])}</ul></div>
  </section>

  <section>
    <h2>{e(t["stamp_h"])}</h2>
    <div class="stamp">
      <img src="/assets/stamp/hongdam-translation-stamp-red.svg" alt="{e(t["stamp_alt"])}" width="300" height="300" loading="lazy">
      <p>{e(t["stamp"])}</p>
    </div>
  </section>

  <section>
    <h2>{e(t["how_h"])}</h2>
    <div class="steps">{steps}</div>
  </section>

  <section id="quote">
    <h2>{e(t["form_h"])}</h2>
    <form id="f" action="/api/contact" method="post" novalidate>
      <div class="row">
        <label>{e(t["f_name"])}<input name="name" type="text" autocomplete="name" maxlength="120"></label>
        <label>{e(t["f_email"])}<input name="email" type="email" autocomplete="email" maxlength="200" required></label>
      </div>
      <div class="row">
        <label>{e(t["f_from"])}<select name="from">{opts([l0, l1, l2])}</select></label>
        <label>{e(t["f_to"])}<select name="to">{opts([l1, l0, l2])}</select></label>
      </div>
      <div class="row">
        <label>{e(t["f_kind"])}<select name="kind">{opts(t["f_kinds"])}</select></label>
        <label>{e(t["f_pages"])}<input name="size" type="text" maxlength="80" placeholder="{e(t["f_pages_ph"])}"></label>
      </div>
      <label>{e(t["f_msg"])}<textarea name="notes" maxlength="3000" placeholder="{e(t["f_msg_ph"])}"></textarea></label>
      <div class="hp" aria-hidden="true"><label>{e(t["f_hp"])}<input name="website" type="text" tabindex="-1" autocomplete="off"></label></div>
      <button type="submit">{e(t["f_send"])}</button>
      <p class="status" id="s" role="status" aria-live="polite"></p>
    </form>
    <p class="mail">{e(t["or_mail"])} <a href="mailto:nan@motdang.net?subject=Translation">nan@motdang.net</a></p>
  </section>
</main>
<footer><span lang="th">หงส์ดำ</span> Hongdam · Chiang Rai · <a href="/">{e(t["home"])}</a></footer>
<script>
(function () {{
  var M = {json.dumps(msgs, ensure_ascii=False)};
  var f = document.getElementById('f'), s = document.getElementById('s'), b = f.querySelector('button');
  function say(t, k) {{ s.textContent = t; s.className = 'status ' + (k || ''); }}
  f.addEventListener('submit', function (ev) {{
    ev.preventDefault();
    var d = Object.fromEntries(new FormData(f));
    if (!d.email) {{ say(M.s_need, 'err'); return; }}
    var msg = ['Translation · page {lang}', 'From: ' + d.from, 'Into: ' + d.to, 'Kind: ' + d.kind,
               'Size: ' + (d.size || '-'), '', d.notes || ''].join('\\n');
    b.disabled = true; say(M.s_sending);
    fetch('/api/contact', {{ method: 'POST', headers: {{ 'content-type': 'application/json' }},
      body: JSON.stringify({{ name: d.name, email: d.email, message: msg, website: d.website }}) }})
      .then(function (r) {{ return r.json().catch(function () {{ return {{}}; }}).then(function (j) {{ return {{ ok: r.ok, j: j }}; }}); }})
      .then(function (r) {{ if (!r.ok || !r.j.ok) throw new Error(); f.reset(); say(M.s_ok, 'ok'); }})
      .catch(function () {{ say(M.s_err, 'err'); }})
      .then(function () {{ b.disabled = false; }});
  }});
}})();
</script>
<script src="/ticker.js" defer></script>
</body>
</html>
"""


def main():
    for lang, path in PAGES.items():
        out = DOCS / path.strip("/") / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page(lang))
        print("wrote", out.relative_to(ROOT))


if __name__ == "__main__":
    main()
