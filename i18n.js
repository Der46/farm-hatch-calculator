export const DEFAULT_LANG = "zh-Hant";

export const SUPPORTED_LANGS = [
    "zh-Hant",
    "en",
    "vi",
    "ja",
    "ko",
    "th",
    "id",
    "es",
    "pt-BR"
];

export const LANGUAGE_META = {
    "zh-Hant": {
        label: "繁體中文",
        locale: "zh-Hant-TW",
        timezoneText: "UTC+08:00"
    },
    en: {
        label: "English",
        locale: "en-US",
        timezoneText: "UTC+00:00"
    },
    vi: {
        label: "Tiếng Việt",
        locale: "vi-VN",
        timezoneText: "UTC+07:00"
    },
    ja: {
        label: "日本語",
        locale: "ja-JP",
        timezoneText: "UTC+09:00"
    },
    ko: {
        label: "한국어",
        locale: "ko-KR",
        timezoneText: "UTC+09:00"
    },
    th: {
        label: "ไทย",
        locale: "th-TH",
        timezoneText: "UTC+07:00"
    },
    id: {
        label: "Indonesia",
        locale: "id-ID",
        timezoneText: "UTC+07:00"
    },
    es: {
        label: "Español",
        locale: "es-ES",
        timezoneText: "UTC-05:00"
    },
    "pt-BR": {
        label: "Português BR",
        locale: "pt-BR",
        timezoneText: "UTC-03:00"
    }
};

export const I18N = {
    "zh-Hant": {
        app: {
            documentTitle: "Coin999 夥伴計算機",
            footer: "© {year} 資料提供 CM大佬群 隊伍｜網頁製作 Coin999-長長久久 隊伍"
        },
        settings: {
            title: "關卡設定",
            saveLocal: "資料保存在本機",
            saved: "已自動儲存",
            clearedAndReset: "已清除並重設",
            timezone: "語言時區：{timezone}"
        },
        mode: {
            hatch: "🥚 孵化",
            farm: "🌱 耕種",
            goldHatch: "🏆 黃金孵化",
            goldFarm: "👑 黃金耕種"
        },
        pageTitle: {
            hatch: "孵化夥伴",
            farm: "耕種夥伴",
            goldHatch: "黃金孵化夥伴",
            goldFarm: "黃金耕種夥伴"
        },
        detailTitle: {
            hatch: "孵化關卡",
            farm: "耕種關卡",
            goldHatch: "黃金關卡",
            goldFarm: "黃金關卡"
        },
        target: {
            hatch: "孵化每位目標分數",
            farm: "耕種每位目標分數",
            goldHatch: "黃金孵化每位目標分數",
            goldFarm: "黃金耕種每位目標分數"
        },
        summary: {
            totalTarget: "總目標分",
            progress: "完成進度"
        },
        button: {
            clearAll: "清除全部本機資料",
            back: "返回"
        },
        person: {
            selfDefault: "自己",
            friendDefault: "隊友",
            selfScore: "自己分數",
            friendScore: "隊友分數"
        },
        memberDefault: {
            normal: "隊友{n}",
            gold: "隊友{n}"
        },
        detail: {
            currentTotal: "目前總分",
            targetScore: "目標分數",
            remainingWhole: "一整顆還差",
            needTokensWhole: "一整顆代幣",
            responsibilityScore: "責任分還差",
            responsibilityTokens: "責任分代幣"
        },
        message: {
            needLine: "還需 {score} 分才能完成",
            completedCanUpgrade: "已完成，可以升等",
            clearConfirm: "確定要清除全部本機資料嗎？此操作無法復原。"
        },
        progressBar: {
            normalTitle: "藍色：自己，綠色：隊友",
            goldTitle: "藍色：自己，金色：隊友"
        },
        unit: {
            percent: "%"
        }
    },

    en: {
        app: {
            documentTitle: "Coin999 Partner Calculator",
            footer: "© {year} Data provided by CM Leaders Team｜Website by Coin999-長長久久 Team"
        },
        settings: {
            title: "Stage Settings",
            saveLocal: "Data is saved locally",
            saved: "Auto-saved",
            clearedAndReset: "Cleared and reset",
            timezone: "Language timezone: {timezone}"
        },
        mode: {
            hatch: "🥚 Hatch",
            farm: "🌱 Farm",
            goldHatch: "🏆 Gold Hatch",
            goldFarm: "👑 Gold Farm"
        },
        pageTitle: {
            hatch: "Hatch Partners",
            farm: "Farm Partners",
            goldHatch: "Gold Hatch Partners",
            goldFarm: "Gold Farm Partners"
        },
        detailTitle: {
            hatch: "Hatch Stage",
            farm: "Farm Stage",
            goldHatch: "Gold Stage",
            goldFarm: "Gold Stage"
        },
        target: {
            hatch: "Target score per Hatch partner",
            farm: "Target score per Farm partner",
            goldHatch: "Target score per Gold Hatch partner",
            goldFarm: "Target score per Gold Farm partner"
        },
        summary: {
            totalTarget: "Total Target",
            progress: "Progress"
        },
        button: {
            clearAll: "Clear all local data",
            back: "Back"
        },
        person: {
            selfDefault: "Me",
            friendDefault: "Partner",
            selfScore: "My Score",
            friendScore: "Partner Score"
        },
        memberDefault: {
            normal: "Partner {n}",
            gold: "Partner {n}"
        },
        detail: {
            currentTotal: "Current Total",
            targetScore: "Target Score",
            remainingWhole: "Whole Remaining",
            needTokensWhole: "Whole Tokens",
            responsibilityScore: "Responsibility Remaining",
            responsibilityTokens: "Responsibility Tokens"
        },
        message: {
            needLine: "{score} points remaining",
            completedCanUpgrade: "Completed. Ready to upgrade",
            clearConfirm: "Clear all local data? This action cannot be undone."
        },
        progressBar: {
            normalTitle: "Blue: Me, Green: Partner",
            goldTitle: "Blue: Me, Gold: Partner"
        },
        unit: {
            percent: "%"
        }
    },

    vi: {
        app: {
            documentTitle: "Máy tính Đồng Đội Coin999",
            footer: "© {year} Dữ liệu được cung cấp bởi đội CM大佬群｜Website được thực hiện bởi Coin999-長長久久 Đội"
        },
        settings: {
            title: "Cài đặt ải",
            saveLocal: "Dữ liệu được lưu trên thiết bị",
            saved: "Đã tự động lưu",
            clearedAndReset: "Đã xoá và đặt lại",
            timezone: "Múi giờ ngôn ngữ: {timezone}"
        },
        mode: {
            hatch: "🥚 Ấp trứng",
            farm: "🌱 Trồng trọt",
            goldHatch: "🏆 Ấp trứng vàng",
            goldFarm: "👑 Trồng trọt vàng"
        },
        pageTitle: {
            hatch: "Đồng đội Ấp trứng",
            farm: "Đồng đội Trồng trọt",
            goldHatch: "Đồng đội Ấp trứng vàng",
            goldFarm: "Đồng đội Trồng trọt vàng"
        },
        detailTitle: {
            hatch: "Ải Ấp trứng",
            farm: "Ải Trồng trọt",
            goldHatch: "Ải vàng",
            goldFarm: "Ải vàng"
        },
        target: {
            hatch: "Điểm mục tiêu mỗi đồng đội Ấp trứng",
            farm: "Điểm mục tiêu mỗi đồng đội Trồng trọt",
            goldHatch: "Điểm mục tiêu mỗi đồng đội Ấp trứng vàng",
            goldFarm: "Điểm mục tiêu mỗi đồng đội Trồng trọt vàng"
        },
        summary: {
            totalTarget: "Tổng điểm mục tiêu",
            progress: "Tiến độ hoàn thành"
        },
        button: {
            clearAll: "Xoá toàn bộ dữ liệu trên thiết bị",
            back: "Quay lại"
        },
        person: {
            selfDefault: "Tôi",
            friendDefault: "Đồng đội",
            selfScore: "Điểm của tôi",
            friendScore: "Điểm đồng đội"
        },
        memberDefault: {
            normal: "Đồng đội {n}",
            gold: "Đồng đội {n}"
        },
        detail: {
            currentTotal: "Tổng điểm hiện tại",
            targetScore: "Điểm mục tiêu",
            remainingWhole: "Còn thiếu cả quả",
            needTokensWhole: "Xu cả quả",
            responsibilityScore: "Điểm trách nhiệm còn thiếu",
            responsibilityTokens: "Xu trách nhiệm"
        },
        message: {
            needLine: "Còn thiếu {score} điểm để hoàn thành",
            completedCanUpgrade: "Đã hoàn thành, có thể nâng cấp",
            clearConfirm: "Bạn có chắc muốn xoá toàn bộ dữ liệu trên thiết bị không? Thao tác này không thể khôi phục."
        },
        progressBar: {
            normalTitle: "Xanh dương: Tôi, Xanh lá: Đồng đội",
            goldTitle: "Xanh dương: Tôi, Vàng: Đồng đội"
        },
        unit: {
            percent: "%"
        }
    },

    ja: {
        app: {
            documentTitle: "Coin999 パートナー計算機",
            footer: "© {year} データ提供：CM大佬群 チーム｜Web制作：Coin999-長長久久 チーム"
        },
        settings: {
            title: "ステージ設定",
            saveLocal: "データは端末に保存されます",
            saved: "自動保存しました",
            clearedAndReset: "削除してリセットしました",
            timezone: "言語タイムゾーン：{timezone}"
        },
        mode: {
            hatch: "🥚 孵化",
            farm: "🌱 栽培",
            goldHatch: "🏆 ゴールド孵化",
            goldFarm: "👑 ゴールド栽培"
        },
        pageTitle: {
            hatch: "孵化パートナー",
            farm: "栽培パートナー",
            goldHatch: "ゴールド孵化パートナー",
            goldFarm: "ゴールド栽培パートナー"
        },
        detailTitle: {
            hatch: "孵化ステージ",
            farm: "栽培ステージ",
            goldHatch: "ゴールドステージ",
            goldFarm: "ゴールドステージ"
        },
        target: {
            hatch: "孵化 1人あたり目標スコア",
            farm: "栽培 1人あたり目標スコア",
            goldHatch: "ゴールド孵化 1人あたり目標スコア",
            goldFarm: "ゴールド栽培 1人あたり目標スコア"
        },
        summary: {
            totalTarget: "合計目標スコア",
            progress: "達成率"
        },
        button: {
            clearAll: "すべてのローカルデータを削除",
            back: "戻る"
        },
        person: {
            selfDefault: "自分",
            friendDefault: "仲間",
            selfScore: "自分のスコア",
            friendScore: "仲間のスコア"
        },
        memberDefault: {
            normal: "仲間{n}",
            gold: "仲間{n}"
        },
        detail: {
            currentTotal: "現在の合計",
            targetScore: "目標スコア",
            remainingWhole: "完成まで不足",
            needTokensWhole: "必要トークン",
            responsibilityScore: "責任分の不足",
            responsibilityTokens: "責任分トークン"
        },
        message: {
            needLine: "完成まであと {score} 点",
            completedCanUpgrade: "完成しました。アップグレードできます",
            clearConfirm: "すべてのローカルデータを削除しますか？この操作は元に戻せません。"
        },
        progressBar: {
            normalTitle: "青：自分、緑：仲間",
            goldTitle: "青：自分、金：仲間"
        },
        unit: {
            percent: "%"
        }
    },

    ko: {
        app: {
            documentTitle: "Coin999 파트너 계산기",
            footer: "© {year} 데이터 제공: CM大佬群 팀｜웹 제작: Coin999-長長久久 팀"
        },
        settings: {
            title: "스테이지 설정",
            saveLocal: "데이터는 기기에 저장됩니다",
            saved: "자동 저장됨",
            clearedAndReset: "삭제 및 초기화 완료",
            timezone: "언어 시간대: {timezone}"
        },
        mode: {
            hatch: "🥚 부화",
            farm: "🌱 재배",
            goldHatch: "🏆 골드 부화",
            goldFarm: "👑 골드 재배"
        },
        pageTitle: {
            hatch: "부화 파트너",
            farm: "재배 파트너",
            goldHatch: "골드 부화 파트너",
            goldFarm: "골드 재배 파트너"
        },
        detailTitle: {
            hatch: "부화 스테이지",
            farm: "재배 스테이지",
            goldHatch: "골드 스테이지",
            goldFarm: "골드 스테이지"
        },
        target: {
            hatch: "부화 1인 목표 점수",
            farm: "재배 1인 목표 점수",
            goldHatch: "골드 부화 1인 목표 점수",
            goldFarm: "골드 재배 1인 목표 점수"
        },
        summary: {
            totalTarget: "총 목표 점수",
            progress: "진행률"
        },
        button: {
            clearAll: "모든 로컬 데이터 삭제",
            back: "뒤로"
        },
        person: {
            selfDefault: "나",
            friendDefault: "팀원",
            selfScore: "내 점수",
            friendScore: "팀원 점수"
        },
        memberDefault: {
            normal: "팀원{n}",
            gold: "팀원{n}"
        },
        detail: {
            currentTotal: "현재 총점",
            targetScore: "목표 점수",
            remainingWhole: "완성까지 부족",
            needTokensWhole: "필요 토큰",
            responsibilityScore: "책임 점수 부족",
            responsibilityTokens: "책임 토큰"
        },
        message: {
            needLine: "완성까지 {score}점 남음",
            completedCanUpgrade: "완료되었습니다. 업그레이드 가능",
            clearConfirm: "모든 로컬 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        },
        progressBar: {
            normalTitle: "파란색: 나, 초록색: 팀원",
            goldTitle: "파란색: 나, 금색: 팀원"
        },
        unit: {
            percent: "%"
        }
    },

    th: {
        app: {
            documentTitle: "เครื่องคิดเลขพาร์ทเนอร์ Coin999",
            footer: "© {year} ข้อมูลโดยทีม CM大佬群｜จัดทำเว็บไซต์โดยทีม Coin999-長長久久"
        },
        settings: {
            title: "ตั้งค่าด่าน",
            saveLocal: "ข้อมูลถูกบันทึกในเครื่อง",
            saved: "บันทึกอัตโนมัติแล้ว",
            clearedAndReset: "ล้างและรีเซ็ตแล้ว",
            timezone: "เขตเวลาของภาษา: {timezone}"
        },
        mode: {
            hatch: "🥚 ฟักไข่",
            farm: "🌱 เพาะปลูก",
            goldHatch: "🏆 ฟักไข่ทอง",
            goldFarm: "👑 เพาะปลูกทอง"
        },
        pageTitle: {
            hatch: "พาร์ทเนอร์ฟักไข่",
            farm: "พาร์ทเนอร์เพาะปลูก",
            goldHatch: "พาร์ทเนอร์ฟักไข่ทอง",
            goldFarm: "พาร์ทเนอร์เพาะปลูกทอง"
        },
        detailTitle: {
            hatch: "ด่านฟักไข่",
            farm: "ด่านเพาะปลูก",
            goldHatch: "ด่านทอง",
            goldFarm: "ด่านทอง"
        },
        target: {
            hatch: "คะแนนเป้าหมายต่อคนสำหรับฟักไข่",
            farm: "คะแนนเป้าหมายต่อคนสำหรับเพาะปลูก",
            goldHatch: "คะแนนเป้าหมายต่อคนสำหรับฟักไข่ทอง",
            goldFarm: "คะแนนเป้าหมายต่อคนสำหรับเพาะปลูกทอง"
        },
        summary: {
            totalTarget: "คะแนนเป้าหมายรวม",
            progress: "ความคืบหน้า"
        },
        button: {
            clearAll: "ล้างข้อมูลในเครื่องทั้งหมด",
            back: "กลับ"
        },
        person: {
            selfDefault: "ฉัน",
            friendDefault: "เพื่อนร่วมทีม",
            selfScore: "คะแนนของฉัน",
            friendScore: "คะแนนเพื่อนร่วมทีม"
        },
        memberDefault: {
            normal: "เพื่อนร่วมทีม {n}",
            gold: "เพื่อนร่วมทีม {n}"
        },
        detail: {
            currentTotal: "คะแนนรวมปัจจุบัน",
            targetScore: "คะแนนเป้าหมาย",
            remainingWhole: "ยังขาดทั้งหมด",
            needTokensWhole: "โทเคนทั้งหมด",
            responsibilityScore: "คะแนนรับผิดชอบที่ขาด",
            responsibilityTokens: "โทเคนรับผิดชอบ"
        },
        message: {
            needLine: "ต้องการอีก {score} คะแนนเพื่อสำเร็จ",
            completedCanUpgrade: "สำเร็จแล้ว สามารถอัปเกรดได้",
            clearConfirm: "ต้องการล้างข้อมูลในเครื่องทั้งหมดหรือไม่? ไม่สามารถย้อนกลับได้"
        },
        progressBar: {
            normalTitle: "สีน้ำเงิน: ฉัน, สีเขียว: เพื่อนร่วมทีม",
            goldTitle: "สีน้ำเงิน: ฉัน, สีทอง: เพื่อนร่วมทีม"
        },
        unit: {
            percent: "%"
        }
    },

    id: {
        app: {
            documentTitle: "Kalkulator Partner Coin999",
            footer: "© {year} Data disediakan oleh Tim CM大佬群｜Website dibuat oleh Tim Coin999-長長久久"
        },
        settings: {
            title: "Pengaturan Level",
            saveLocal: "Data disimpan di perangkat",
            saved: "Tersimpan otomatis",
            clearedAndReset: "Dihapus dan direset",
            timezone: "Zona waktu bahasa: {timezone}"
        },
        mode: {
            hatch: "🥚 Menetas",
            farm: "🌱 Bertani",
            goldHatch: "🏆 Menetas Emas",
            goldFarm: "👑 Bertani Emas"
        },
        pageTitle: {
            hatch: "Partner Menetas",
            farm: "Partner Bertani",
            goldHatch: "Partner Menetas Emas",
            goldFarm: "Partner Bertani Emas"
        },
        detailTitle: {
            hatch: "Level Menetas",
            farm: "Level Bertani",
            goldHatch: "Level Emas",
            goldFarm: "Level Emas"
        },
        target: {
            hatch: "Target skor per partner Menetas",
            farm: "Target skor per partner Bertani",
            goldHatch: "Target skor per partner Menetas Emas",
            goldFarm: "Target skor per partner Bertani Emas"
        },
        summary: {
            totalTarget: "Total Target",
            progress: "Progres"
        },
        button: {
            clearAll: "Hapus semua data lokal",
            back: "Kembali"
        },
        person: {
            selfDefault: "Saya",
            friendDefault: "Partner",
            selfScore: "Skor Saya",
            friendScore: "Skor Partner"
        },
        memberDefault: {
            normal: "Partner {n}",
            gold: "Partner {n}"
        },
        detail: {
            currentTotal: "Total Saat Ini",
            targetScore: "Skor Target",
            remainingWhole: "Sisa untuk selesai",
            needTokensWhole: "Token dibutuhkan",
            responsibilityScore: "Sisa tanggung jawab",
            responsibilityTokens: "Token tanggung jawab"
        },
        message: {
            needLine: "Masih perlu {score} poin untuk selesai",
            completedCanUpgrade: "Selesai. Siap untuk naik level",
            clearConfirm: "Hapus semua data lokal? Tindakan ini tidak dapat dibatalkan."
        },
        progressBar: {
            normalTitle: "Biru: Saya, Hijau: Partner",
            goldTitle: "Biru: Saya, Emas: Partner"
        },
        unit: {
            percent: "%"
        }
    },

    es: {
        app: {
            documentTitle: "Calculadora de Socios Coin999",
            footer: "© {year} Datos proporcionados por el equipo CM大佬群｜Sitio web creado por Coin999-長長久久 Equipo"
        },
        settings: {
            title: "Configuración de etapa",
            saveLocal: "Los datos se guardan localmente",
            saved: "Guardado automático",
            clearedAndReset: "Borrado y reiniciado",
            timezone: "Zona horaria del idioma: {timezone}"
        },
        mode: {
            hatch: "🥚 Incubar",
            farm: "🌱 Cultivar",
            goldHatch: "🏆 Incubación dorada",
            goldFarm: "👑 Cultivo dorado"
        },
        pageTitle: {
            hatch: "Socios de Incubación",
            farm: "Socios de Cultivo",
            goldHatch: "Socios de Incubación Dorada",
            goldFarm: "Socios de Cultivo Dorado"
        },
        detailTitle: {
            hatch: "Etapa de Incubación",
            farm: "Etapa de Cultivo",
            goldHatch: "Etapa Dorada",
            goldFarm: "Etapa Dorada"
        },
        target: {
            hatch: "Puntaje objetivo por socio de Incubación",
            farm: "Puntaje objetivo por socio de Cultivo",
            goldHatch: "Puntaje objetivo por socio de Incubación Dorada",
            goldFarm: "Puntaje objetivo por socio de Cultivo Dorado"
        },
        summary: {
            totalTarget: "Objetivo total",
            progress: "Progreso"
        },
        button: {
            clearAll: "Borrar todos los datos locales",
            back: "Volver"
        },
        person: {
            selfDefault: "Yo",
            friendDefault: "Socio",
            selfScore: "Mi puntaje",
            friendScore: "Puntaje del socio"
        },
        memberDefault: {
            normal: "Socio {n}",
            gold: "Socio {n}"
        },
        detail: {
            currentTotal: "Total actual",
            targetScore: "Puntaje objetivo",
            remainingWhole: "Falta para completar",
            needTokensWhole: "Tokens necesarios",
            responsibilityScore: "Falta de responsabilidad",
            responsibilityTokens: "Tokens de responsabilidad"
        },
        message: {
            needLine: "Faltan {score} puntos para completar",
            completedCanUpgrade: "Completado. Listo para mejorar",
            clearConfirm: "¿Borrar todos los datos locales? Esta acción no se puede deshacer."
        },
        progressBar: {
            normalTitle: "Azul: Yo, Verde: Socio",
            goldTitle: "Azul: Yo, Dorado: Socio"
        },
        unit: {
            percent: "%"
        }
    },

    "pt-BR": {
        app: {
            documentTitle: "Calculadora de Parceiros Coin999",
            footer: "© {year} Dados fornecidos pela equipe CM大佬群｜Site criado por Coin999-長長久久 Equipe"
        },
        settings: {
            title: "Configurações da fase",
            saveLocal: "Os dados são salvos localmente",
            saved: "Salvo automaticamente",
            clearedAndReset: "Apagado e redefinido",
            timezone: "Fuso horário do idioma: {timezone}"
        },
        mode: {
            hatch: "🥚 Chocar",
            farm: "🌱 Cultivar",
            goldHatch: "🏆 Chocar Dourado",
            goldFarm: "👑 Cultivo Dourado"
        },
        pageTitle: {
            hatch: "Parceiros de Chocar",
            farm: "Parceiros de Cultivo",
            goldHatch: "Parceiros de Chocar Dourado",
            goldFarm: "Parceiros de Cultivo Dourado"
        },
        detailTitle: {
            hatch: "Fase de Chocar",
            farm: "Fase de Cultivo",
            goldHatch: "Fase Dourada",
            goldFarm: "Fase Dourada"
        },
        target: {
            hatch: "Pontuação-alvo por parceiro de Chocar",
            farm: "Pontuação-alvo por parceiro de Cultivo",
            goldHatch: "Pontuação-alvo por parceiro de Chocar Dourado",
            goldFarm: "Pontuação-alvo por parceiro de Cultivo Dourado"
        },
        summary: {
            totalTarget: "Meta total",
            progress: "Progresso"
        },
        button: {
            clearAll: "Apagar todos os dados locais",
            back: "Voltar"
        },
        person: {
            selfDefault: "Eu",
            friendDefault: "Parceiro",
            selfScore: "Minha pontuação",
            friendScore: "Pontuação do parceiro"
        },
        memberDefault: {
            normal: "Parceiro {n}",
            gold: "Parceiro {n}"
        },
        detail: {
            currentTotal: "Total atual",
            targetScore: "Pontuação-alvo",
            remainingWhole: "Falta para completar",
            needTokensWhole: "Tokens necessários",
            responsibilityScore: "Falta de responsabilidade",
            responsibilityTokens: "Tokens de responsabilidade"
        },
        message: {
            needLine: "Faltam {score} pontos para completar",
            completedCanUpgrade: "Concluído. Pronto para melhorar",
            clearConfirm: "Apagar todos os dados locais? Esta ação não pode ser desfeita."
        },
        progressBar: {
            normalTitle: "Azul: Eu, Verde: Parceiro",
            goldTitle: "Azul: Eu, Dourado: Parceiro"
        },
        unit: {
            percent: "%"
        }
    }
};
