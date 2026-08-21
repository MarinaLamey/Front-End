import type { LegalDoc } from './types'

/* The MI-Mony Terms of Use, in both languages. See ./types.ts for why the text lives here. */

const SITE = { link: 'www.mi-mony.sa', href: 'https://www.mi-mony.sa' } as const
const SUPPORT = { link: 'support@mi-mony.sa', href: 'mailto:support@mi-mony.sa' } as const

export const TERMS_EN: LegalDoc = {
  title: 'MI-Mony Terms of Use and Conditions',
  updated: 'July 15, 2026',
  updatedLabel: 'Last Updated',
  backToHome: 'Back to home',
  note: 'Disclaimer: Note this is a temporary document, and an updated version (compliant with local laws) will be provided later.',
  sections: [
    {
      title: '1. Definitions',
      blocks: [
        {
          list: [
            [
              { bold: 'Platform / MI-Mony:' },
              ' Refers to MI-Mony, operated by MI-Technology, based in Dhahran, Kingdom of Saudi Arabia, with the official website ',
              SITE,
              '.',
            ],
            [
              { bold: 'User / Client / Buyer:' },
              " Any individual or entity registered to use MI-Mony's services as a buyer.",
            ],
            [{ bold: 'Supplier:' }, ' Any party offering products for sale through the platform.'],
            [
              { bold: 'Products:' },
              ' B2B Marketplace application for Saudi construction-materials sector listed on the platform.',
            ],
            [{ bold: 'Agreement:' }, ' This Terms of Use document and its future amendments.'],
          ],
        },
      ],
    },
    {
      title: '2. Acceptance and Use',
      blocks: [
        {
          list: [
            ['By accessing or registering on MI-Mony, you agree to these Terms of Use.'],
            [
              'MI-Technologies reserves the right to modify this Agreement at any time. Updates take effect once published on ',
              SITE,
              '.',
            ],
            ['Continued use implies acceptance of any updated version.'],
          ],
        },
      ],
    },
    {
      title: '3. Registration & Accounts',
      blocks: [
        {
          list: [
            [
              'Users must provide accurate information, maintain confidentiality, and are responsible for all activities under their accounts.',
            ],
            [
              'MI-Technologies reserves the right to suspend or terminate accounts in case of misuse or violations.',
            ],
          ],
        },
      ],
    },
    {
      title: '4. Services & Transactions',
      blocks: [
        {
          list: [
            [
              'MI-Mony acts as a digital marketplace connecting suppliers and buyers for Saudi construction-materials sector transactions.',
            ],
            ['MI-Technologies is not a party to any sale contract between suppliers and buyers.'],
            ['Prices and offers are set solely by suppliers.'],
          ],
        },
      ],
    },
    {
      title: '5. Purchasing & Payment',
      blocks: [
        {
          list: [
            ['Orders are placed through the platform and are subject to supplier confirmation.'],
            ['Payment methods may include cash, bank transfer, or deferred payment (if applicable).'],
            ['All taxes and fees will be disclosed prior to purchase.'],
          ],
        },
      ],
    },
    {
      title: '6. Returns & Refunds',
      blocks: [
        {
          list: [
            ['Return policies vary per supplier and product type.'],
            ['Faulty or non-conforming products can be reported to ', SUPPORT, '.'],
            ['MI-Technologies is not liable for any delay or supplier failure to process returns.'],
          ],
        },
      ],
    },
    {
      title: '7. User Responsibilities',
      blocks: [
        {
          list: [
            ['Users must comply with applicable laws and refrain from misusing the platform.'],
            ['MI-Technologies is not liable for technical issues or service interruptions.'],
          ],
        },
      ],
    },
    {
      title: '8. Intellectual Property',
      blocks: [
        {
          p: [
            'All intellectual property related to the platform — including MI-Technologies trademarks, logos, content, and software — belong to MI-Technologies Limited Company.',
          ],
        },
      ],
    },
    {
      title: '9. Disclaimer',
      blocks: [
        {
          p: [
            'MI-Technologies is not liable for product quality, supplier performance, or transaction outcomes between users.',
          ],
        },
      ],
    },
    {
      title: '10. Account Termination',
      blocks: [
        {
          list: [
            ['MI-Technologies may suspend or terminate any account violating these terms.'],
            ['Users can request account deletion via ', SUPPORT, '.'],
          ],
        },
      ],
    },
    {
      title: '11. Privacy Policy',
      blocks: [{ p: ["User data is handled per MI-Technology's Privacy Policy, available at ", SITE, '.'] }],
    },
    {
      title: '12. Governing Law',
      blocks: [
        {
          p: [
            'This Agreement is governed by the laws of the Kingdom of Saudi Arabia, with exclusive jurisdiction for the courts of Eastern region, Saudi Arabia.',
          ],
        },
      ],
    },
  ],
}

export const TERMS_AR: LegalDoc = {
  title: 'شروط وأحكام استخدام مي-موني',
  updated: '١٥ يوليو ٢٠٢٦',
  updatedLabel: 'آخر تحديث',
  backToHome: 'العودة إلى الرئيسية',
  note: 'إخلاء مسؤولية: هذه وثيقة مؤقتة، وسيتم توفير نسخة محدّثة متوافقة مع الأنظمة المحلية لاحقًا.',
  sections: [
    {
      title: '١. التعريفات',
      blocks: [
        {
          list: [
            [
              { bold: 'المنصة / مي-موني:' },
              ' تشير إلى منصة مي-موني، المُشغّلة من قِبل مي-تكنولوجي، ومقرّها الظهران بالمملكة العربية السعودية، وموقعها الرسمي ',
              SITE,
              '.',
            ],
            [
              { bold: 'المستخدم / العميل / المشتري:' },
              ' أي شخص أو منشأة مسجّلة للاستفادة من خدمات مي-موني بصفة مشترٍ.',
            ],
            [{ bold: 'المورّد:' }, ' أي طرف يعرض منتجات للبيع من خلال المنصة.'],
            [
              { bold: 'المنتجات:' },
              ' تطبيق سوق إلكتروني بين المنشآت لقطاع مواد البناء في المملكة العربية السعودية، بما هو معروض على المنصة.',
            ],
            [{ bold: 'الاتفاقية:' }, ' وثيقة شروط الاستخدام هذه وأي تعديلات لاحقة عليها.'],
          ],
        },
      ],
    },
    {
      title: '٢. القبول والاستخدام',
      blocks: [
        {
          list: [
            ['بدخولك إلى منصة مي-موني أو تسجيلك فيها، فإنك توافق على شروط الاستخدام هذه.'],
            [
              'تحتفظ مي-تكنولوجيز بالحق في تعديل هذه الاتفاقية في أي وقت، وتصبح التحديثات نافذة فور نشرها على ',
              SITE,
              '.',
            ],
            ['يُعدّ استمرارك في الاستخدام قبولًا لأي نسخة محدّثة.'],
          ],
        },
      ],
    },
    {
      title: '٣. التسجيل والحسابات',
      blocks: [
        {
          list: [
            [
              'يجب على المستخدمين تقديم معلومات صحيحة، والحفاظ على سرّيتها، ويتحمّلون المسؤولية عن جميع الأنشطة التي تتم عبر حساباتهم.',
            ],
            ['تحتفظ مي-تكنولوجيز بالحق في تعليق الحسابات أو إنهائها في حال إساءة الاستخدام أو مخالفة الشروط.'],
          ],
        },
      ],
    },
    {
      title: '٤. الخدمات والمعاملات',
      blocks: [
        {
          list: [
            [
              'تعمل مي-موني كسوق رقمي يربط المورّدين بالمشترين لإتمام معاملات قطاع مواد البناء في المملكة العربية السعودية.',
            ],
            ['مي-تكنولوجيز ليست طرفًا في أي عقد بيع بين المورّدين والمشترين.'],
            ['يحدّد المورّدون وحدهم الأسعار والعروض.'],
          ],
        },
      ],
    },
    {
      title: '٥. الشراء والدفع',
      blocks: [
        {
          list: [
            ['تُقدَّم الطلبات عبر المنصة وتخضع لتأكيد المورّد.'],
            ['قد تشمل وسائل الدفع النقد أو التحويل البنكي أو الدفع الآجل (إن وُجد).'],
            ['يتم الإفصاح عن جميع الضرائب والرسوم قبل إتمام الشراء.'],
          ],
        },
      ],
    },
    {
      title: '٦. الإرجاع والاسترداد',
      blocks: [
        {
          list: [
            ['تختلف سياسات الإرجاع باختلاف المورّد ونوع المنتج.'],
            ['يمكن الإبلاغ عن المنتجات المعيبة أو غير المطابقة عبر ', SUPPORT, '.'],
            ['لا تتحمّل مي-تكنولوجيز المسؤولية عن أي تأخير أو إخفاق من المورّد في معالجة الإرجاع.'],
          ],
        },
      ],
    },
    {
      title: '٧. مسؤوليات المستخدم',
      blocks: [
        {
          list: [
            ['يلتزم المستخدمون بالأنظمة المعمول بها، ويمتنعون عن إساءة استخدام المنصة.'],
            ['لا تتحمّل مي-تكنولوجيز المسؤولية عن الأعطال التقنية أو انقطاع الخدمة.'],
          ],
        },
      ],
    },
    {
      title: '٨. الملكية الفكرية',
      blocks: [
        {
          p: [
            'جميع حقوق الملكية الفكرية المتعلقة بالمنصة — بما في ذلك العلامات التجارية والشعارات والمحتوى والبرمجيات الخاصة بمي-تكنولوجيز — مملوكة لشركة مي-تكنولوجيز المحدودة.',
          ],
        },
      ],
    },
    {
      title: '٩. إخلاء المسؤولية',
      blocks: [
        {
          p: [
            'لا تتحمّل مي-تكنولوجيز المسؤولية عن جودة المنتجات أو أداء المورّدين أو نتائج المعاملات بين المستخدمين.',
          ],
        },
      ],
    },
    {
      title: '١٠. إنهاء الحساب',
      blocks: [
        {
          list: [
            ['يجوز لمي-تكنولوجيز تعليق أو إنهاء أي حساب يخالف هذه الشروط.'],
            ['يمكن للمستخدمين طلب حذف حساباتهم عبر ', SUPPORT, '.'],
          ],
        },
      ],
    },
    {
      title: '١١. سياسة الخصوصية',
      blocks: [
        { p: ['تُعالَج بيانات المستخدمين وفقًا لسياسة الخصوصية الخاصة بمي-تكنولوجي، والمتاحة على ', SITE, '.'] },
      ],
    },
    {
      title: '١٢. النظام الواجب التطبيق',
      blocks: [
        {
          p: [
            'تخضع هذه الاتفاقية لأنظمة المملكة العربية السعودية، وتنعقد الولاية القضائية الحصرية لمحاكم المنطقة الشرقية بالمملكة العربية السعودية.',
          ],
        },
      ],
    },
  ],
}
