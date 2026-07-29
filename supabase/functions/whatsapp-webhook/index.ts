import { createClient } from "npm:@supabase/supabase-js@2";

type Lang = "ms" | "en" | "zh" | "ta";

const CONSENT_VERSION = "2026-07-29";
const PRIVACY_URL = "https://aduan.sahkan.my/privacy";

const STRINGS: Record<Lang, Record<string, string>> = {
  ms: {
    category_prompt: "Apa isu yang ingin anda laporkan?",
    other_detail_prompt: "Sila terangkan secara ringkas isu anda.",
    location_prompt:
      "Sila kongsi lokasi anda: ketik 📎 (lampirkan), kemudian 'Lokasi'. Tidak di lokasi? Anda boleh menaip alamat.\n\n" +
      "Taip 'kategori' untuk tukar kategori, atau 'mula semula' untuk mula semula.",
    description_prompt: "Sila terangkan isu ini, anda boleh menaip, menghantar foto, atau nota suara.",
    tap_option_error: "Maaf, sila ketik salah satu pilihan di atas.",
    location_invalid_error: "Maaf, itu bukan pin lokasi, alamat, atau arahan yang dikenali.",
    description_required_error: "Sila taip penerangan ringkas tentang isu ini.",
    submit_success: "Terima kasih! Laporan anda telah direkodkan sebagai {ticket_number}. Kami akan menghubungi anda jika ada kemas kini.",
    submit_error: "Maaf, terdapat ralat semasa menyimpan laporan anda. Sila cuba sebentar lagi.",
    photo_received_prompt: "Gambar diterima! Sila tambah penerangan ringkas.",
    photo_error: "Maaf, gambar tidak dapat dimuat naik. Sila cuba semula atau taip penerangan.",
    voice_received_prompt: "Kami menerima nota suara anda tetapi tidak dapat mentranskripnya. Sila taip penerangan ringkas.",
    voice_error: "Maaf, nota suara tidak dapat diproses. Sila cuba semula atau taip penerangan.",
    confirm_summary_header: "Sila sahkan laporan anda:",
    confirm_category_label: "Kategori",
    confirm_location_pin: "Lokasi: pin dikongsi",
    confirm_location_prefix: "Lokasi: ",
    confirm_description_label: "Penerangan",
    confirm_photo_attached: "Gambar: dilampirkan",
    confirm_voice_attached: "Nota suara: transkripsi di bawah, sila semak ketepatannya",
    confirm_prompt: "Ketik Sahkan untuk teruskan, atau taip 'kategori'/'mula semula' untuk membuat perubahan.",
    confirm_invalid: "Sila ketik Sahkan, atau taip 'kategori'/'mula semula' untuk membuat perubahan.",
    confirm_button: "Sahkan",
    ask_name_prompt: "Apakah nama anda? Ini membantu kami menghubungi anda mengenai laporan ini.",
    name_required_error: "Sila taip nama anda.",
    ask_contact_prompt: "Bolehkah kami menghubungi anda melalui WhatsApp ini jika kami memerlukan maklumat lanjut atau untuk memberi kemas kini mengenai laporan ini?",
    contact_invalid: "Sila ketik Ya atau Tidak.",
    yes_button: "Ya",
    no_button: "Tidak",
    ask_agency_prompt:
      "Ke agensi mana anda telah melaporkan isu ini? (contoh: MBJB, SPAN, TNB)\n\n" +
      "Taip 'langkau' jika tiada / tidak pasti.",
    ask_agency_ref_prompt:
      "Apakah nombor rujukan yang diberikan agensi tersebut?\n\n" +
      "Taip 'langkau' jika tiada / tidak pasti.",
    ask_agency_date_prompt:
      "Lebih kurang bilakah anda melaporkan kepada agensi itu? (contoh: 15/03/2026 atau 2026-03-15)\n\n" +
      "Taip 'langkau' jika tidak pasti.",
    agency_date_invalid:
      "Maaf, kami tidak dapat baca tarikh itu. Cuba DD/MM/YYYY, atau taip 'langkau'.",
    consent_prompt:
      "Sebelum kami simpan laporan anda:\n\n" +
      "• Dasar privasi: " + PRIVACY_URL + "\n" +
      "• Kami mungkin kongsi butiran kes (termasuk rujukan) dengan agensi untuk susulan\n" +
      "• Anda boleh pilih sama ada kes dipaparkan di peta awam (tanpa nama atau nombor telefon)\n\n" +
      "Ketik pilihan anda:",
    consent_public_button: "Setuju (awam)",
    consent_private_button: "Setuju (sendiri)",
    consent_invalid: "Sila ketik salah satu pilihan persetujuan di atas.",
    stop_confirm:
      "Anda telah berhenti menerima mesej daripada kami. Kes terbuka kekal; kami tidak akan menghantar mesej lanjut. Taip mesej baharu jika anda ingin melapor semula kemudian.",
    delete_confirm:
      "Permintaan pemadaman data anda telah direkodkan. Kami akan mengesahkan identiti anda dan melengkapkan dalam masa 21 hari. Maklumat lanjut: https://aduan.sahkan.my/data-deletion",
  },
  en: {
    category_prompt: "What issue would you like to report?",
    other_detail_prompt: "Please briefly describe the issue.",
    location_prompt:
      "Please share your location: tap 📎 (attach), then 'Location'. Not on-site? You can type your address instead.\n\n" +
      "Type 'category' to change category, or 'restart' to start over.",
    description_prompt: "Please describe the issue, you can type, send a photo, or a voice note.",
    tap_option_error: "Sorry, please tap one of the options above.",
    location_invalid_error: "Sorry, that wasn't a location pin, an address, or a recognised command.",
    description_required_error: "Please type a short description of the issue.",
    submit_success: "Thank you! Your report has been logged as {ticket_number}. We'll follow up if there's an update.",
    submit_error: "Sorry, something went wrong while saving your report. Please try again in a moment.",
    photo_received_prompt: "Photo received! Please also add a short description.",
    photo_error: "Sorry, the photo couldn't be uploaded. Please try again or type a description.",
    voice_received_prompt: "We received your voice note but couldn't transcribe it. Please type a short description.",
    voice_error: "Sorry, the voice note couldn't be processed. Please try again or type a description.",
    confirm_summary_header: "Please confirm your report:",
    confirm_category_label: "Category",
    confirm_location_pin: "Location: pin shared",
    confirm_location_prefix: "Location: ",
    confirm_description_label: "Description",
    confirm_photo_attached: "Photo: attached",
    confirm_voice_attached: "Voice note: transcribed below, please check it's correct",
    confirm_prompt: "Tap Confirm to continue, or type 'category'/'restart' to make changes.",
    confirm_invalid: "Please tap Confirm, or type 'category'/'restart' to make changes.",
    confirm_button: "Confirm",
    ask_name_prompt: "What's your name? This helps us follow up on this report.",
    name_required_error: "Please type your name.",
    ask_contact_prompt: "Can we contact you on this WhatsApp number if we need more details or to update you on this report?",
    contact_invalid: "Please tap Yes or No.",
    yes_button: "Yes",
    no_button: "No",
    ask_agency_prompt:
      "Which agency did you already report this to? (e.g. MBJB, SPAN, TNB)\n\n" +
      "Type 'skip' if none / unsure.",
    ask_agency_ref_prompt:
      "What reference number did that agency give you?\n\n" +
      "Type 'skip' if none / unsure.",
    ask_agency_date_prompt:
      "Roughly when did you report it to the agency? (e.g. 15/03/2026 or 2026-03-15)\n\n" +
      "Type 'skip' if unsure.",
    agency_date_invalid:
      "Sorry, we couldn't read that date. Try DD/MM/YYYY, or type 'skip'.",
    consent_prompt:
      "Before we save your report:\n\n" +
      "• Privacy policy: " + PRIVACY_URL + "\n" +
      "• We may share case details (including the reference) with the agency to follow up\n" +
      "• You can choose whether the case appears on the public map (never with your name or phone number)\n\n" +
      "Tap your choice:",
    consent_public_button: "Agree (public)",
    consent_private_button: "Agree (private)",
    consent_invalid: "Please tap one of the consent options above.",
    stop_confirm:
      "You have opted out of messages from us. Open cases stay open; we will not message you further. Send a new message later if you want to report again.",
    delete_confirm:
      "Your data deletion request has been logged. We will verify your identity and complete it within 21 days. More info: https://aduan.sahkan.my/data-deletion",
  },
  zh: {
    category_prompt: "您要报告什么问题?",
    other_detail_prompt: "请简要描述该问题。",
    location_prompt:
      "请分享您的位置:点击📎(附加),然后选择'位置'。不在现场?您也可以输入地址。\n\n" +
      "输入 'category' 更改类别,或输入 'restart' 重新开始。",
    description_prompt: "请描述该问题,您可以输入文字、发送照片或语音留言。",
    tap_option_error: "抱歉,请点击上面的选项之一。",
    location_invalid_error: "抱歉,这不是位置定位、地址或可识别的指令。",
    description_required_error: "请输入该问题的简短描述。",
    submit_success: "谢谢!您的报告已记录为 {ticket_number}。如有更新,我们会通知您。",
    submit_error: "抱歉,保存您的报告时出现问题。请稍后再试。",
    photo_received_prompt: "已收到照片!请添加简短说明。",
    photo_error: "抱歉,照片上传失败。请重试或输入说明。",
    voice_received_prompt: "我们收到了您的语音留言,但无法转录。请输入简短说明。",
    voice_error: "抱歉,语音留言处理失败。请重试或输入说明。",
    confirm_summary_header: "请确认您的报告:",
    confirm_category_label: "类别",
    confirm_location_pin: "位置:已分享定位",
    confirm_location_prefix: "位置:",
    confirm_description_label: "描述",
    confirm_photo_attached: "照片:已附上",
    confirm_voice_attached: "语音留言:转录如下,请检查是否正确",
    confirm_prompt: "点击'确认'继续,或输入 'category'/'restart' 进行更改。",
    confirm_invalid: "请点击'确认',或输入 'category'/'restart' 进行更改。",
    confirm_button: "确认",
    ask_name_prompt: "请问您的姓名是?这有助于我们跟进此报告。",
    name_required_error: "请输入您的姓名。",
    ask_contact_prompt: "如果我们需要更多信息或向您更新此报告,可以通过此WhatsApp联系您吗?",
    contact_invalid: "请点击'可以'或'不可以'。",
    yes_button: "可以",
    no_button: "不可以",
    ask_agency_prompt: "您已向哪个机构报告过此问题?(例如 MBJB、SPAN、TNB)\n\n输入 'skip' 可跳过。",
    ask_agency_ref_prompt: "该机构给您的参考编号是什么?\n\n输入 'skip' 可跳过。",
    ask_agency_date_prompt: "您大约何时向该机构报告?(例如 15/03/2026 或 2026-03-15)\n\n输入 'skip' 可跳过。",
    agency_date_invalid: "抱歉,无法识别该日期。请用 DD/MM/YYYY,或输入 'skip'。",
    consent_prompt:
      "保存报告前:\n\n" +
      "• 隐私政策: " + PRIVACY_URL + "\n" +
      "• 我们可能与机构共享案件详情(含参考编号)以便跟进\n" +
      "• 您可选择是否在公开地图上显示案件(绝不显示姓名或电话)\n\n" +
      "请点击您的选择:",
    consent_public_button: "同意(公开)",
    consent_private_button: "同意(不公开)",
    consent_invalid: "请点击上方的同意选项之一。",
    stop_confirm: "您已停止接收我们的消息。未结案件仍保留;我们不会再发消息。以后如需再报告,请发送新消息。",
    delete_confirm: "您的数据删除请求已记录。我们将核实身份并在21天内完成。详情: https://aduan.sahkan.my/data-deletion",
  },
  ta: {
    category_prompt: "நீங்கள் எந்த சிக்கலைப் புகாரளிக்க விரும்புகிறீர்கள்?",
    other_detail_prompt: "சிக்கலை சுருக்கமாக விவரிக்கவும்.",
    location_prompt:
      "உங்கள் இருப்பிடத்தைப் பகிரவும்: 📎 (இணைப்பு) தட்டவும், பின்னர் 'Location' தேர்வு செய்யவும். நீங்கள் அங்கு இல்லையா? முகவரியைத் தட்டச்சு செய்யலாம்.\n\n" +
      "வகையை மாற்ற 'category' எனத் தட்டச்சு செய்யவும், அல்லது மீண்டும் தொடங்க 'restart' எனத் தட்டச்சு செய்யவும்.",
    description_prompt: "சிக்கலை விவரிக்கவும்; நீங்கள் தட்டச்சு செய்யலாம், புகைப்படம் அல்லது குரல் குறிப்பு அனுப்பலாம்.",
    tap_option_error: "மேலே உள்ள விருப்பங்களில் ஒன்றைத் தட்டவும்.",
    location_invalid_error: "மன்னிக்கவும், அது இருப்பிடப் பின், முகவரி அல்லது அறியப்பட்ட கட்டளை அல்ல.",
    description_required_error: "சிக்கலின் சுருக்கமான விளக்கத்தைத் தட்டச்சு செய்யவும்.",
    submit_success: "நன்றி! உங்கள் புகார் {ticket_number} எனப் பதிவு செய்யப்பட்டுள்ளது. புதுப்பிப்பு இருந்தால் தெரிவிப்போம்.",
    submit_error: "மன்னிக்கவும், உங்கள் புகாரைச் சேமிப்பதில் சிக்கல் ஏற்பட்டது. சிறிது நேரத்தில் முயற்சிக்கவும்.",
    photo_received_prompt: "புகைப்படம் பெறப்பட்டது! சுருக்கமான விளக்கத்தைச் சேர்க்கவும்.",
    photo_error: "மன்னிக்கவும், புகைப்படத்தைப் பதிவேற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும் அல்லது விளக்கத்தைத் தட்டச்சு செய்யவும்.",
    voice_received_prompt: "உங்கள் குரல் குறிப்பு பெறப்பட்டது, ஆனால் எழுத்துவடிவமாக்க முடியவில்லை. சுருக்கமான விளக்கத்தைத் தட்டச்சு செய்யவும்.",
    voice_error: "மன்னிக்கவும், குரல் குறிப்பைச் செயல்படுத்த முடியவில்லை. மீண்டும் முயற்சிக்கவும் அல்லது விளக்கத்தைத் தட்டச்சு செய்யவும்.",
    confirm_summary_header: "உங்கள் புகாரை உறுதிப்படுத்தவும்:",
    confirm_category_label: "வகை",
    confirm_location_pin: "இடம்: பின் பகிரப்பட்டது",
    confirm_location_prefix: "இடம்: ",
    confirm_description_label: "விளக்கம்",
    confirm_photo_attached: "புகைப்படம்: இணைக்கப்பட்டுள்ளது",
    confirm_voice_attached: "குரல் குறிப்பு: கீழே எழுத்துவடிவமாக்கப்பட்டுள்ளது, சரிபார்க்கவும்",
    confirm_prompt: "தொடர 'சரி' என்பதைத் தட்டவும், அல்லது மாற்ற 'category'/'restart' எனத் தட்டச்சு செய்யவும்.",
    confirm_invalid: "சரி' என்பதைத் தட்டவும், அல்லது மாற்ற 'category'/'restart' எனத் தட்டச்சு செய்யவும்.",
    confirm_button: "சரி",
    ask_name_prompt: "உங்கள் பெயர் என்ன? இது இந்த புகார் தொடர்பாக உங்களைத் தொடர்புகொள்ள உதவும்.",
    name_required_error: "உங்கள் பெயரைத் தட்டச்சு செய்யவும்.",
    ask_contact_prompt: "இந்த புகார் குறித்து கூடுதல் தகவல் தேவைப்பட்டால் அல்லது புதுப்பிப்பு வழங்க இந்த WhatsApp எண்ணில் உங்களைத் தொடர்பு கொள்ளலாமா?",
    contact_invalid: "தயவுசெய்து 'ஆம்' அல்லது 'இல்லை' என்பதைத் தட்டவும்.",
    yes_button: "ஆம்",
    no_button: "இல்லை",
    ask_agency_prompt: "இந்த சிக்கலை ஏற்கனவே எந்த நிறுவனத்திடம் புகாரளித்தீர்கள்? (எ.கா. MBJB, SPAN, TNB)\n\nதவிர்க்க 'skip' எனத் தட்டச்சு செய்யவும்.",
    ask_agency_ref_prompt: "அந்த நிறுவனம் கொடுத்த குறிப்பு எண் என்ன?\n\nதவிர்க்க 'skip' எனத் தட்டச்சு செய்யவும்.",
    ask_agency_date_prompt: "ஏறக்குறைய எப்போது அந்த நிறுவனத்திடம் புகாரளித்தீர்கள்? (எ.கா. 15/03/2026 அல்லது 2026-03-15)\n\nதவிர்க்க 'skip' எனத் தட்டச்சு செய்யவும்.",
    agency_date_invalid: "மன்னிக்கவும், தேதியைப் படிக்க முடியவில்லை. DD/MM/YYYY முயற்சிக்கவும், அல்லது 'skip' எனத் தட்டச்சு செய்யவும்.",
    consent_prompt:
      "உங்கள் புகாரைச் சேமிப்பதற்கு முன்:\n\n" +
      "• தனியுரிமைக் கொள்கை: " + PRIVACY_URL + "\n" +
      "• தொடர்ந்து செயல்பட நிறுவனத்துடன் வழக்கு விவரங்களை (குறிப்பு எண் உட்பட) பகிரலாம்\n" +
      "• பொது வரைபடத்தில் வழக்கு தோன்றலாமா என்பதை நீங்கள் தேர்வு செய்யலாம் (பெயர்/தொலைபேசி இல்லை)\n\n" +
      "உங்கள் தேர்வைத் தட்டவும்:",
    consent_public_button: "ஒப்புதல் (பொது)",
    consent_private_button: "ஒப்புதல் (தனி)",
    consent_invalid: "மேலே உள்ள ஒப்புதல் விருப்பங்களில் ஒன்றைத் தட்டவும்.",
    stop_confirm: "எங்களிடமிருந்து செய்திகளை நிறுத்திவிட்டீர்கள். திறந்த வழக்குகள் தொடரும்; மேலும் செய்தி அனுப்பமாட்டோம். பின்னர் புகாரளிக்க புதிய செய்தி அனுப்பவும்.",
    delete_confirm: "உங்கள் தரவு நீக்கக் கோரிக்கை பதிவு செய்யப்பட்டது. அடையாளத்தைச் சரிபார்த்து 21 நாட்களில் முடிப்போம். விவரம்: https://aduan.sahkan.my/data-deletion",
  },
};

const CATEGORY_LABELS: Record<string, Record<Lang, string>> = {
  jalan_berlubang: { ms: "Jalan berlubang", en: "Pothole", zh: "坑洞", ta: "சாலைக் குழி" },
  banjir: { ms: "Banjir", en: "Flooding", zh: "水灾", ta: "வெள்ளம்" },
  lampu_jalan: { ms: "Lampu jalan", en: "Streetlight", zh: "路灯", ta: "தெரு விளக்கு" },
  sampah: { ms: "Sampah", en: "Rubbish", zh: "垃圾", ta: "குப்பை" },
  lain_lain: { ms: "Lain-lain", en: "Other", zh: "其他", ta: "மற்றவை" },
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const LANGUAGE_MAP: Record<string, string> = { "1": "ms", "2": "en", "3": "zh", "4": "ta" };

const CATEGORIES = ["jalan_berlubang", "banjir", "lampu_jalan", "sampah", "lain_lain"];

const RESTART_COMMANDS = ["restart", "language", "bahasa", "mula semula"];
const CATEGORY_COMMANDS = ["category", "kategori"];
const SKIP_COMMANDS = ["skip", "langkau", "langkan", "-"];
const STOP_COMMANDS = ["stop", "berhenti"];
const DELETE_COMMANDS = ["padam", "delete"];

const CLEAR_CATEGORY_ONWARDS = {
  category: null,
  description: null,
  photo_url: null,
  voice_note_url: null,
  latitude: null,
  longitude: null,
  address_text: null,
  name: null,
  contactable: null,
  agency: null,
  agency_ref: null,
  agency_reported_at: null,
  publish_agency_ref: null,
  public_display_opt_out: null,
  consent_given_at: null,
  consent_version: null,
};

function isSkip(text: string | undefined): boolean {
  return !!text && SKIP_COMMANDS.includes(text.trim().toLowerCase());
}

/** Parse rough dates: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY. */
function parseAgencyDate(raw: string): string | null {
  const t = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(t);
  if (dmy) {
    const d = dmy[1].padStart(2, "0");
    const m = dmy[2].padStart(2, "0");
    const y = dmy[3];
    const dt = new Date(`${y}-${m}-${d}T00:00:00Z`);
    if (Number.isNaN(dt.getTime())) return null;
    if (dt.getUTCFullYear() !== Number(y) || dt.getUTCMonth() + 1 !== Number(m) || dt.getUTCDate() !== Number(d)) {
      return null;
    }
    return `${y}-${m}-${d}`;
  }
  return null;
}

async function isMessagingOptedOut(whatsappNumber: string): Promise<boolean> {
  const { data } = await supabase
    .from("whatsapp_messaging_preferences")
    .select("messaging_opted_out")
    .eq("whatsapp_number", whatsappNumber)
    .maybeSingle();
  return data?.messaging_opted_out === true;
}

async function setMessagingOptedOut(whatsappNumber: string) {
  await supabase.from("whatsapp_messaging_preferences").upsert({
    whatsapp_number: whatsappNumber,
    messaging_opted_out: true,
    updated_at: new Date().toISOString(),
  });
  await supabase
    .from("tickets")
    .update({ messaging_opted_out: true })
    .eq("whatsapp_number", whatsappNumber);
}

async function sendWhatsAppMessage(to: string, payload: Record<string, unknown>) {
  if (await isMessagingOptedOut(to)) {
    console.log("Skip WhatsApp send; messaging opted out:", to);
    return;
  }

  const res = await fetch(`https://graph.facebook.com/v25.0/${Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("WHATSAPP_ACCESS_TOKEN")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", to, ...payload }),
  });
  if (!res.ok) console.error("WhatsApp send failed:", await res.text());
}

/** Bypass opt-out check for the single STOP/DELETE confirmation replies. */
async function sendWhatsAppMessageForced(to: string, payload: Record<string, unknown>) {
  const res = await fetch(`https://graph.facebook.com/v25.0/${Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("WHATSAPP_ACCESS_TOKEN")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", to, ...payload }),
  });
  if (!res.ok) console.error("WhatsApp send failed:", await res.text());
}

function sendText(to: string, text: string) {
  return sendWhatsAppMessage(to, { type: "text", text: { body: text } });
}

function sendTextForced(to: string, text: string) {
  return sendWhatsAppMessageForced(to, { type: "text", text: { body: text } });
}

function sendList(
  to: string,
  bodyText: string,
  rows: { id: string; title: string; description?: string }[],
) {
  return sendWhatsAppMessage(to, {
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: bodyText },
      action: { button: "Choose / Pilih", sections: [{ rows }] },
    },
  });
}

function sendButtons(to: string, bodyText: string, buttons: { id: string; title: string }[]) {
  return sendWhatsAppMessage(to, {
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: { buttons: buttons.map((b) => ({ type: "reply", reply: b })) },
    },
  });
}

function sendLanguagePrompt(to: string) {
  return sendList(to, "Selamat datang! Sila pilih bahasa anda.\nWelcome! Please choose your language.", [
    { id: "lang_ms", title: "Bahasa Melayu" },
    { id: "lang_en", title: "English" },
    { id: "lang_zh", title: "中文" },
    { id: "lang_ta", title: "தமிழ்" },
  ]);
}

function sendCategoryPrompt(to: string, lang: Lang) {
  return sendList(
    to,
    STRINGS[lang].category_prompt,
    CATEGORIES.map((id) => ({ id, title: CATEGORY_LABELS[id][lang] })),
  );
}

function sendLocationPrompt(to: string, lang: Lang) {
  return sendText(to, STRINGS[lang].location_prompt);
}

function sendDescriptionPrompt(to: string, lang: Lang) {
  return sendText(to, STRINGS[lang].description_prompt);
}

function sendConsentPrompt(to: string, lang: Lang) {
  return sendButtons(to, STRINGS[lang].consent_prompt, [
    { id: "consent_public", title: STRINGS[lang].consent_public_button },
    { id: "consent_private", title: STRINGS[lang].consent_private_button },
  ]);
}

function buildSummary(s: Record<string, any>, lang: Lang): string {
  const lines = [STRINGS[lang].confirm_summary_header, ""];
  lines.push(`${STRINGS[lang].confirm_category_label}: ${CATEGORY_LABELS[s.category]?.[lang] ?? s.category}`);
  if (s.address_text) {
    lines.push(`${STRINGS[lang].confirm_location_prefix}${s.address_text}`);
  } else if (s.latitude != null && s.longitude != null) {
    lines.push(STRINGS[lang].confirm_location_pin);
  }
  if (s.voice_note_url) {
    lines.push(STRINGS[lang].confirm_voice_attached);
  }
  if (s.description) {
    lines.push(`${STRINGS[lang].confirm_description_label}: ${s.description}`);
  }
  if (s.photo_url) {
    lines.push(STRINGS[lang].confirm_photo_attached);
  }
  return lines.join("\n");
}

async function goToConfirm(from: string, session: Record<string, any>, fields: Record<string, unknown>, lang: Lang) {
  const merged = { ...session, ...fields };
  await supabase.from("conversation_sessions").update({ ...fields, step: "confirm" }).eq("whatsapp_number", from);
  await sendText(from, buildSummary(merged, lang));
  await sendButtons(from, STRINGS[lang].confirm_prompt, [{ id: "confirm_yes", title: STRINGS[lang].confirm_button }]);
}

async function downloadWhatsAppMedia(mediaId: string): Promise<{ bytes: Uint8Array; mimeType: string } | null> {
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

  const metaRes = await fetch(`https://graph.facebook.com/v25.0/${mediaId}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!metaRes.ok) {
    console.error("Media metadata fetch failed:", await metaRes.text());
    return null;
  }
  const meta = await metaRes.json();

  const fileRes = await fetch(meta.url, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!fileRes.ok) {
    console.error("Media download failed:", await fileRes.text());
    return null;
  }

  return { bytes: new Uint8Array(await fileRes.arrayBuffer()), mimeType: meta.mime_type };
}

async function uploadTicketMedia(bucket: string, mediaId: string, bytes: Uint8Array, mimeType: string): Promise<string | null> {
  const ext = mimeType.split(";")[0].split("/")[1] ?? "bin";
  const path = `${mediaId}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, new Blob([bytes], { type: mimeType }), { contentType: mimeType, upsert: true });

  if (error) {
    console.error("Storage upload failed:", JSON.stringify(error));
    return null;
  }

  if (bucket === "ticket-photos") {
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }
  return path;
}

async function transcribeAudio(bytes: Uint8Array, mimeType: string, language: string): Promise<string | null> {
  const ext = mimeType.includes("ogg") ? "ogg" : (mimeType.split(";")[0].split("/")[1] ?? "ogg");
  const formData = new FormData();
  formData.append("file", new Blob([bytes], { type: mimeType }), `audio.${ext}`);
  formData.append("model", "whisper-large-v3-turbo");
  formData.append("language", language);

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}` },
    body: formData,
  });

  if (!res.ok) {
    console.error("Transcription failed:", await res.text());
    return null;
  }

  const data = await res.json();
  const text = data.text?.trim();
  return text ? text : null;
}

async function handleSubmit(
  from: string,
  session: {
    category: string;
    description: string | null;
    latitude: number | null;
    longitude: number | null;
    address_text: string | null;
    language: string;
    photo_url: string | null;
    voice_note_url: string | null;
    name: string | null;
    contactable: boolean | null;
    agency: string | null;
    agency_ref: string | null;
    agency_reported_at: string | null;
    publish_agency_ref: boolean | null;
    public_display_opt_out: boolean | null;
    consent_given_at: string | null;
    consent_version: string | null;
  },
  lang: Lang,
  whatsappMessageId: string,
  profileName: string | null,
) {
  const { data: ticket, error } = await supabase.rpc("create_or_link_ticket", {
    p_whatsapp_number: from,
    p_category: session.category,
    p_description: session.description,
    p_latitude: session.latitude,
    p_longitude: session.longitude,
    p_name: session.name ?? profileName,
    p_language: session.language,
    p_address_text: session.address_text,
    p_photo_url: session.photo_url ?? null,
    p_voice_note_url: session.voice_note_url ?? null,
    p_contactable: session.contactable ?? true,
    p_whatsapp_message_id: whatsappMessageId,
    p_agency: session.agency ?? null,
    p_agency_ref: session.agency_ref ?? null,
    p_agency_reported_at: session.agency_reported_at ?? null,
    p_publish_agency_ref: session.publish_agency_ref ?? true,
    p_public_display_opt_out: session.public_display_opt_out ?? false,
    p_consent_given_at: session.consent_given_at ?? new Date().toISOString(),
    p_consent_version: session.consent_version ?? CONSENT_VERSION,
  });

  if (error || !ticket) {
    console.error("create_or_link_ticket failed:", JSON.stringify(error));
    await sendText(from, STRINGS[lang].submit_error);
    return;
  }

  console.log("Ticket created/linked:", JSON.stringify(ticket));

  await sendText(from, STRINGS[lang].submit_success.replace("{ticket_number}", ticket.ticket_number));

  await supabase
    .from("conversation_sessions")
    .update({ ...CLEAR_CATEGORY_ONWARDS, step: "category" })
    .eq("whatsapp_number", from);
}

async function advanceFromLocation(
  from: string,
  session: Record<string, any>,
  fields: Record<string, unknown>,
  lang: Lang,
) {
  const merged = { ...session, ...fields };

  if (merged.description) {
    await goToConfirm(from, session, fields, lang);
  } else {
    await supabase.from("conversation_sessions").update({ ...fields, step: "description" }).eq("whatsapp_number", from);
    await sendDescriptionPrompt(from, lang);
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = Deno.env.get("WHATSAPP_VERIFY_TOKEN");

    if (mode === "subscribe" && token === expected) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method === "POST") {
    const body = await req.json();
    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const profileName = body?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name ?? null;

    if (message) {
      const from = message.from;
      const text = message.text?.body?.trim();
      const replyId = message.interactive?.list_reply?.id ?? message.interactive?.button_reply?.id;
      const lowerText = text?.toLowerCase();

      const { data: session } = await supabase
        .from("conversation_sessions")
        .select("*")
        .eq("whatsapp_number", from)
        .maybeSingle();

      const lang = (session?.language ?? "en") as Lang;

      // Keyword handling (trimmed, case-insensitive) — before normal flow.
      if (lowerText && STOP_COMMANDS.includes(lowerText)) {
        await sendTextForced(from, STRINGS[lang].stop_confirm);
        await setMessagingOptedOut(from);
        return new Response("EVENT_RECEIVED", { status: 200 });
      }
      if (lowerText && DELETE_COMMANDS.includes(lowerText)) {
        await supabase.from("deletion_requests").insert({ whatsapp_number: from, status: "pending" });
        await sendTextForced(from, STRINGS[lang].delete_confirm);
        return new Response("EVENT_RECEIVED", { status: 200 });
      }

      // After STOP, ignore all further messages (no replies).
      if (await isMessagingOptedOut(from)) {
        return new Response("EVENT_RECEIVED", { status: 200 });
      }

      if (!session) {
        await supabase.from("conversation_sessions").insert({ whatsapp_number: from, step: "language" });
        await sendLanguagePrompt(from);
      } else if (lowerText && RESTART_COMMANDS.includes(lowerText)) {
        await supabase
          .from("conversation_sessions")
          .update({ ...CLEAR_CATEGORY_ONWARDS, language: null, step: "language" })
          .eq("whatsapp_number", from);
        await sendLanguagePrompt(from);
      } else if (session.language && lowerText && CATEGORY_COMMANDS.includes(lowerText)) {
        await supabase
          .from("conversation_sessions")
          .update({ ...CLEAR_CATEGORY_ONWARDS, step: "category" })
          .eq("whatsapp_number", from);
        await sendCategoryPrompt(from, lang);
      } else if (session.step === "language") {
        const newLang = replyId?.startsWith("lang_") ? replyId.replace("lang_", "") : LANGUAGE_MAP[text ?? ""];
        if (newLang) {
          await supabase
            .from("conversation_sessions")
            .update({ language: newLang, step: "category" })
            .eq("whatsapp_number", from);
          await sendCategoryPrompt(from, newLang as Lang);
        } else {
          await sendText(from, "Sorry, please tap one of the options above.");
          await sendLanguagePrompt(from);
        }
      } else if (session.step === "category") {
        const category = replyId && CATEGORIES.includes(replyId) ? replyId : null;
        if (category) {
          if (category === "lain_lain") {
            await supabase
              .from("conversation_sessions")
              .update({ category, step: "other_detail" })
              .eq("whatsapp_number", from);
            await sendText(from, STRINGS[lang].other_detail_prompt);
          } else {
            await supabase
              .from("conversation_sessions")
              .update({ category, step: "location" })
              .eq("whatsapp_number", from);
            await sendLocationPrompt(from, lang);
          }
        } else {
          await sendText(from, STRINGS[lang].tap_option_error);
          await sendCategoryPrompt(from, lang);
        }
      } else if (session.step === "other_detail") {
        if (text) {
          await supabase
            .from("conversation_sessions")
            .update({ description: text, step: "location" })
            .eq("whatsapp_number", from);
          await sendLocationPrompt(from, lang);
        } else {
          await sendText(from, STRINGS[lang].description_required_error);
        }
      } else if (session.step === "location") {
        if (message.type === "location" && message.location) {
          const { latitude, longitude } = message.location;
          await advanceFromLocation(from, session, { latitude, longitude, address_text: null }, lang);
        } else if (text) {
          await advanceFromLocation(from, session, { address_text: text, latitude: null, longitude: null }, lang);
        } else {
          await sendText(from, STRINGS[lang].location_invalid_error);
          await sendLocationPrompt(from, lang);
        }
      } else if (session.step === "description") {
        if (message.type === "image" && message.image) {
          const media = await downloadWhatsAppMedia(message.image.id);
          if (media) {
            const photoUrl = await uploadTicketMedia("ticket-photos", message.image.id, media.bytes, media.mimeType);
            const caption = message.image.caption?.trim();

            if (caption) {
              await goToConfirm(from, session, { description: caption, photo_url: photoUrl }, lang);
            } else {
              await supabase.from("conversation_sessions").update({ photo_url: photoUrl }).eq("whatsapp_number", from);
              await sendText(from, STRINGS[lang].photo_received_prompt);
            }
          } else {
            await sendText(from, STRINGS[lang].photo_error);
          }
        } else if (message.type === "audio" && message.audio) {
          const media = await downloadWhatsAppMedia(message.audio.id);
          if (media) {
            const voiceUrl = await uploadTicketMedia("ticket-voice-notes", message.audio.id, media.bytes, media.mimeType);
            const transcript = await transcribeAudio(media.bytes, media.mimeType, lang);

            if (transcript) {
              await goToConfirm(from, session, { description: transcript, voice_note_url: voiceUrl }, lang);
            } else {
              await supabase.from("conversation_sessions").update({ voice_note_url: voiceUrl }).eq("whatsapp_number", from);
              await sendText(from, STRINGS[lang].voice_received_prompt);
            }
          } else {
            await sendText(from, STRINGS[lang].voice_error);
          }
        } else if (text) {
          await goToConfirm(from, session, { description: text }, lang);
        } else {
          await sendText(from, STRINGS[lang].description_required_error);
        }
      } else if (session.step === "confirm") {
        if (replyId === "confirm_yes") {
          await supabase.from("conversation_sessions").update({ step: "ask_name" }).eq("whatsapp_number", from);
          await sendText(from, STRINGS[lang].ask_name_prompt);
        } else if (message.type === "image" && message.image) {
          const media = await downloadWhatsAppMedia(message.image.id);
          if (media) {
            const photoUrl = await uploadTicketMedia("ticket-photos", message.image.id, media.bytes, media.mimeType);
            const caption = message.image.caption?.trim();
            const newDescription = caption
              ? (session.description ? `${session.description}\n${caption}` : caption)
              : session.description;
            await goToConfirm(from, session, { photo_url: photoUrl, description: newDescription }, lang);
          } else {
            await sendText(from, STRINGS[lang].photo_error);
            await sendButtons(from, STRINGS[lang].confirm_prompt, [{ id: "confirm_yes", title: STRINGS[lang].confirm_button }]);
          }
        } else if (message.type === "audio" && message.audio) {
          const media = await downloadWhatsAppMedia(message.audio.id);
          if (media) {
            const voiceUrl = await uploadTicketMedia("ticket-voice-notes", message.audio.id, media.bytes, media.mimeType);
            const transcript = await transcribeAudio(media.bytes, media.mimeType, lang);
            const newDescription = transcript
              ? (session.description ? `${session.description}\n${transcript}` : transcript)
              : session.description;
            await goToConfirm(from, session, { voice_note_url: voiceUrl, description: newDescription }, lang);
          } else {
            await sendText(from, STRINGS[lang].voice_error);
            await sendButtons(from, STRINGS[lang].confirm_prompt, [{ id: "confirm_yes", title: STRINGS[lang].confirm_button }]);
          }
        } else if (text) {
          const newDescription = session.description ? `${session.description}\n${text}` : text;
          await goToConfirm(from, session, { description: newDescription }, lang);
        } else {
          await sendButtons(from, STRINGS[lang].confirm_invalid, [{ id: "confirm_yes", title: STRINGS[lang].confirm_button }]);
        }
      } else if (session.step === "ask_name") {
        if (text) {
          await supabase.from("conversation_sessions").update({ name: text, step: "ask_contact" }).eq("whatsapp_number", from);
          await sendButtons(from, STRINGS[lang].ask_contact_prompt, [
            { id: "contact_yes", title: STRINGS[lang].yes_button },
            { id: "contact_no", title: STRINGS[lang].no_button },
          ]);
        } else {
          await sendText(from, STRINGS[lang].name_required_error);
        }
      } else if (session.step === "ask_contact") {
        if (replyId === "contact_yes" || replyId === "contact_no") {
          const contactable = replyId === "contact_yes";
          await supabase
            .from("conversation_sessions")
            .update({ contactable, step: "ask_agency" })
            .eq("whatsapp_number", from);
          await sendText(from, STRINGS[lang].ask_agency_prompt);
        } else {
          await sendButtons(from, STRINGS[lang].contact_invalid, [
            { id: "contact_yes", title: STRINGS[lang].yes_button },
            { id: "contact_no", title: STRINGS[lang].no_button },
          ]);
        }
      } else if (session.step === "ask_agency") {
        if (text) {
          const agency = isSkip(text) ? null : text;
          await supabase
            .from("conversation_sessions")
            .update({ agency, step: "ask_agency_ref" })
            .eq("whatsapp_number", from);
          await sendText(from, STRINGS[lang].ask_agency_ref_prompt);
        } else {
          await sendText(from, STRINGS[lang].ask_agency_prompt);
        }
      } else if (session.step === "ask_agency_ref") {
        if (text) {
          const agency_ref = isSkip(text) ? null : text;
          await supabase
            .from("conversation_sessions")
            .update({ agency_ref, step: "ask_agency_date" })
            .eq("whatsapp_number", from);
          await sendText(from, STRINGS[lang].ask_agency_date_prompt);
        } else {
          await sendText(from, STRINGS[lang].ask_agency_ref_prompt);
        }
      } else if (session.step === "ask_agency_date") {
        if (text) {
          if (isSkip(text)) {
            await supabase
              .from("conversation_sessions")
              .update({ agency_reported_at: null, step: "ask_consent" })
              .eq("whatsapp_number", from);
            await sendConsentPrompt(from, lang);
          } else {
            const parsed = parseAgencyDate(text);
            if (!parsed) {
              await sendText(from, STRINGS[lang].agency_date_invalid);
            } else {
              await supabase
                .from("conversation_sessions")
                .update({ agency_reported_at: parsed, step: "ask_consent" })
                .eq("whatsapp_number", from);
              await sendConsentPrompt(from, lang);
            }
          }
        } else {
          await sendText(from, STRINGS[lang].ask_agency_date_prompt);
        }
      } else if (session.step === "ask_consent") {
        if (replyId === "consent_public" || replyId === "consent_private") {
          const public_display_opt_out = replyId === "consent_private";
          const publish_agency_ref = replyId === "consent_public";
          const consent_given_at = new Date().toISOString();
          const updated = {
            ...session,
            public_display_opt_out,
            publish_agency_ref,
            consent_given_at,
            consent_version: CONSENT_VERSION,
          };
          await supabase
            .from("conversation_sessions")
            .update({
              public_display_opt_out,
              publish_agency_ref,
              consent_given_at,
              consent_version: CONSENT_VERSION,
            })
            .eq("whatsapp_number", from);
          await handleSubmit(from, updated, lang, message.id, profileName);
        } else {
          await sendConsentPrompt(from, lang);
          await sendText(from, STRINGS[lang].consent_invalid);
        }
      } else {
        await sendText(from, `(next step: ${session.step}, coming soon)`);
      }
    }

    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  return new Response("Method not allowed", { status: 405 });
});
