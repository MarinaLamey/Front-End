import type { LegalDoc } from './types'

/* The MI Technology Privacy Policy, in both languages. See ./types.ts for why the text lives here. */

const PRIVACY_EMAIL = { link: 'privacy@mi-technologies.sa', href: 'mailto:privacy@mi-technologies.sa' } as const

export const PRIVACY_EN: LegalDoc = {
  title: 'Privacy Policy for MI Technology',
  updated: 'July 14, 2026',
  updatedLabel: 'Last Updated',
  backToHome: 'Back to home',
  sections: [
    {
      title: '1. Preface',
      blocks: [
        {
          list: [
            [
              'Welcome to MI Technology ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This Privacy Policy document explains how we collect, use, share, and protect your information when you use our website, mobile application, or any of our digital services.',
            ],
            [
              'If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact us.',
            ],
          ],
        },
      ],
    },
    {
      title: '2. Consent',
      blocks: [{ p: ['By using our websites, you hereby consent to our Privacy Policy and agree to its terms.'] }],
    },
    {
      title: '3. Information we collect',
      blocks: [
        { p: ['We may collect, use, store, and transfer different kinds of personal data about you:'] },
        {
          list: [
            [
              'When you register for an Account, we may ask for your contact information, including items such as name, company name, address, email address, and telephone number.',
            ],
            [
              'Any other information we gather about you from other cookies, Websites or companies that you have agreed to their policies, which gives them the right to sell, give, exchange the Data they have with other cookies.',
            ],
            [
              'If you contact us directly, we may receive additional information about you such as your name, email address, phone number, the contents of the message and/or attachments you may send us, and any other information you may choose to provide.',
            ],
          ],
        },
      ],
    },
    {
      title: '4. How and Why We Use Your Data (Legal Basis)',
      blocks: [
        {
          p: [
            'Under the PDPL, we will only use your personal data when the law allows us to. Most commonly, we use the information we collect in various ways, including to:',
          ],
        },
        {
          list: [
            ['Provide, operate, and maintain our websites, and Businesses.'],
            ['Improve, personalize, and expand our websites, and Businesses.'],
            ['Understand and analyse how you use our websites, and Businesses.'],
            ['Develop new products, services, features, and functionality.'],
            [
              'Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the websites or businesses, and for marketing and promotional purposes.',
            ],
            ['Send you emails, call you or any other contact process.'],
            ['Find and prevent fraud and any other illegal actions.'],
          ],
        },
      ],
    },
    {
      title: '5. Log Files',
      blocks: [
        {
          list: [
            ['MI-Technologies follows a standard procedure of using log files.'],
            [
              'These files log visitors when they visit websites. All hosting companies do this and a part of hosting services’ analytics.',
            ],
            [
              'The information collected by log files include internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable.',
            ],
            [
              'The purpose of the information is for analysing trends, administering the site, tracking users’ movement on the website, and gathering demographic information.',
            ],
          ],
        },
      ],
    },
    {
      title: '6. Third Party Privacy Policies',
      blocks: [
        {
          list: [
            [
              "MI-Technologies' Privacy Policy does not apply to other advertisers or websites. Thus, we are advising you to consult the respective Privacy Policies of these third-party ad servers for more detailed information. It may include their practices and instructions about how to opt-out of certain options.",
            ],
            [
              'You can choose to disable cookies through your individual browser options. To know more detailed information about cookie management with specific web browsers, it can be found at the browsers’ respective websites.',
            ],
          ],
        },
      ],
    },
    {
      title: '7. Privacy Rights',
      blocks: [
        { p: ['Under this policy, consumers have the right to:'] },
        {
          list: [
            [
              'Request that a business that collects a consumer’s personal data disclose the categories and specific pieces of personal data that a business has collected about consumers.',
            ],
            ['Request that a business delete any personal data about the consumer that a business has collected.'],
            [
              'If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us.',
            ],
          ],
        },
      ],
    },
    {
      title: '8. Data Protection Rights',
      blocks: [
        {
          p: [
            'We would like to make sure you are fully aware of all of your data protection rights. Every user is entitled to the following:',
          ],
        },
        {
          list: [
            [
              'The right to access – You have the right to request copies of your personal data. We may charge you a small fee for this service.',
            ],
            [
              'The right to rectification – You have the right to request that we correct any information you believe is inaccurate. You also have the right to request that we complete the information you believe is incomplete.',
            ],
            [
              'The right to erasure – You have the right to request that we erase your personal data, under certain conditions.',
            ],
            [
              'The right to restrict processing – You have the right to request that we restrict the processing of your personal data, under certain conditions.',
            ],
            [
              'The right to object to processing – You have the right to object to our processing of your personal data, under certain conditions.',
            ],
            [
              'The right to data portability – You have the right to request that we transfer the data that we have collected to another organization, or directly to you, under certain conditions.',
            ],
            [
              'If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us.',
            ],
          ],
        },
      ],
    },
    {
      title: '9. Children’s Information',
      blocks: [
        {
          list: [
            [
              'Another part of our priority is adding protection for children while using the internet. We encourage parents and guardians to observe, participate in, and/or monitor and guide their online activity.',
            ],
            [
              'MI-Technologies does not knowingly collect any Personal Identifiable Information from children under the age of 13. If you think that your child provided this kind of information on our website, we strongly encourage you to contact us immediately and we will do our best efforts to promptly remove such information from our records.',
            ],
          ],
        },
      ],
    },
    {
      title: '10. Laws and Regulations',
      blocks: [
        {
          list: [
            [
              'This privacy statement falls under the laws and regulations of the Kingdom of Saudi Arabia of consumer rights, confidential information, any laws shall apply by the court of law in the Kingdom.',
            ],
            [
              'By logging into our websites and clicking I agree or I acknowledge the privacy policy or terms and conditions we empower MI-Technologies all the rights mentioned above and more with other cookies unless stated otherwise.',
            ],
          ],
        },
      ],
    },
    {
      title: '11. Cross-Border Data Transfers',
      blocks: [
        {
          p: [
            'Your data is primarily processed and stored on secure servers located within the Kingdom of Saudi Arabia.',
          ],
        },
        {
          p: [
            'If we transfer your personal data outside of Saudi Arabia, we ensure a similar degree of protection is afforded to it by ensuring that the transfer complies with the PDPL cross-border regulatory framework (e.g., utilizing standard contractual clauses approved by SDAIA or transferring to jurisdictions with an adequate level of protection).',
          ],
        },
      ],
    },
    {
      title: '12. Data Security',
      blocks: [
        { p: ['MI-Technologies applies industry-standard security practices to safeguard user data.'] },
        {
          list: [
            ['Data is stored securely on protected servers.'],
            ['We use encryption, authentication, and restricted access measures.'],
            ['Only authorized staff can access data when necessary.'],
          ],
        },
      ],
    },
    {
      title: '13. Data Retention',
      blocks: [
        { p: ['We retain your information as long as needed for service delivery or legal compliance.'] },
        { p: ['Upon account deletion, we remove or anonymize personal data within 90 days.'] },
      ],
    },
    {
      title: '14. Policy Updates',
      blocks: [
        {
          p: [
            'We may revise this Privacy Policy periodically. Any updates will be posted directly on this page with an updated "Last Updated" date.',
          ],
        },
        { p: ['Any significant changes will be communicated via email or in-app notifications.'] },
        { p: ['Continued use of the platform constitutes your acceptance of the updated terms.'] },
      ],
    },
    {
      title: '15. Contact us',
      blocks: [
        {
          p: [
            'All provisions mentioned herein regarding inquiries, modifications, deletions, or anything not provided for herein shall be contacted via the following address: ',
            PRIVACY_EMAIL,
          ],
        },
        { p: [{ bold: 'Address:' }, ' Dammam, Kingdom of Saudi Arabia'] },
      ],
    },
  ],
}

export const PRIVACY_AR: LegalDoc = {
  title: 'سياسة الخصوصية لشركة مي تكنولوجي',
  updated: '١٤ يوليو ٢٠٢٦',
  updatedLabel: 'آخر تحديث',
  backToHome: 'العودة إلى الرئيسية',
  sections: [
    {
      title: '١. تمهيد',
      blocks: [
        {
          list: [
            [
              'مرحبًا بك في مي تكنولوجي («نحن» أو «الشركة»). نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية. توضّح وثيقة سياسة الخصوصية هذه كيف نجمع معلوماتك ونستخدمها ونشاركها ونحميها عند استخدامك لموقعنا الإلكتروني أو تطبيقنا للهواتف المحمولة أو أيٍّ من خدماتنا الرقمية.',
            ],
            ['إذا كانت لديك أي أسئلة إضافية أو رغبت في مزيد من المعلومات حول سياسة الخصوصية، فلا تتردد في التواصل معنا.'],
          ],
        },
      ],
    },
    {
      title: '٢. الموافقة',
      blocks: [{ p: ['باستخدامك لمواقعنا الإلكترونية، فإنك توافق بموجب ذلك على سياسة الخصوصية وتقبل شروطها.'] }],
    },
    {
      title: '٣. المعلومات التي نجمعها',
      blocks: [
        { p: ['قد نجمع أنواعًا مختلفة من بياناتك الشخصية ونستخدمها ونخزّنها وننقلها، وذلك على النحو التالي:'] },
        {
          list: [
            [
              'عند تسجيلك للحصول على حساب، قد نطلب منك معلومات التواصل الخاصة بك، ومنها الاسم واسم المنشأة والعنوان والبريد الإلكتروني ورقم الهاتف.',
            ],
            [
              'أي معلومات أخرى نحصل عليها عنك من ملفات تعريف الارتباط أو المواقع أو الشركات التي وافقت على سياساتها، بما يمنحها الحق في بيع البيانات التي لديها أو منحها أو تبادلها مع ملفات تعريف ارتباط أخرى.',
            ],
            [
              'إذا تواصلت معنا مباشرة، فقد نتلقّى معلومات إضافية عنك مثل اسمك وبريدك الإلكتروني ورقم هاتفك ومحتوى الرسالة و/أو المرفقات التي ترسلها إلينا، وأي معلومات أخرى تختار تزويدنا بها.',
            ],
          ],
        },
      ],
    },
    {
      title: '٤. كيف ولماذا نستخدم بياناتك (الأساس النظامي)',
      blocks: [
        {
          p: [
            'بموجب نظام حماية البيانات الشخصية (PDPL)، لن نستخدم بياناتك الشخصية إلا حين يسمح النظام بذلك. وفي الغالب نستخدم المعلومات التي نجمعها بطرق متعددة، من بينها:',
          ],
        },
        {
          list: [
            ['تقديم مواقعنا وأعمالنا وتشغيلها وصيانتها.'],
            ['تحسين مواقعنا وأعمالنا وتخصيصها وتوسيعها.'],
            ['فهم وتحليل طريقة استخدامك لمواقعنا وأعمالنا.'],
            ['تطوير منتجات وخدمات وخصائص ووظائف جديدة.'],
            [
              'التواصل معك، سواء مباشرة أو عبر أحد شركائنا، بما يشمل خدمة العملاء وتزويدك بالتحديثات وغيرها من المعلومات المتعلقة بالمواقع أو الأعمال، ولأغراض التسويق والترويج.',
            ],
            ['إرسال رسائل البريد الإلكتروني إليك أو الاتصال بك أو أي وسيلة تواصل أخرى.'],
            ['كشف الاحتيال وأي تصرفات غير نظامية ومنعها.'],
          ],
        },
      ],
    },
    {
      title: '٥. ملفات السجل',
      blocks: [
        {
          list: [
            ['تتّبع مي-تكنولوجيز الإجراء المعتاد في استخدام ملفات السجل.'],
            ['تسجّل هذه الملفات بيانات الزوار عند زيارتهم للمواقع، وهو إجراء تقوم به جميع شركات الاستضافة وجزء من تحليلات خدمات الاستضافة.'],
            [
              'تشمل المعلومات التي تجمعها ملفات السجل عناوين بروتوكول الإنترنت (IP)، ونوع المتصفح، ومزوّد خدمة الإنترنت (ISP)، وختم التاريخ والوقت، وصفحات الإحالة والخروج، وربما عدد النقرات. وهذه المعلومات غير مرتبطة بأي بيانات تُعرّف بالهوية الشخصية.',
            ],
            [
              'الغرض من هذه المعلومات هو تحليل الاتجاهات، وإدارة الموقع، وتتبّع حركة المستخدمين داخله، وجمع المعلومات الديموغرافية.',
            ],
          ],
        },
      ],
    },
    {
      title: '٦. سياسات الخصوصية للأطراف الأخرى',
      blocks: [
        {
          list: [
            [
              'لا تنطبق سياسة الخصوصية الخاصة بمي-تكنولوجيز على المعلنين أو المواقع الأخرى. لذا ننصحك بالرجوع إلى سياسات الخصوصية الخاصة بخوادم الإعلانات التابعة لجهات خارجية للحصول على معلومات أكثر تفصيلًا، وقد تتضمن ممارساتها وإرشاداتها حول كيفية إلغاء الاشتراك في خيارات معينة.',
            ],
            [
              'يمكنك تعطيل ملفات تعريف الارتباط من خلال خيارات متصفحك. وللاطلاع على معلومات أكثر تفصيلًا حول إدارة ملفات تعريف الارتباط في متصفحات معيّنة، يمكنك زيارة المواقع الرسمية لتلك المتصفحات.',
            ],
          ],
        },
      ],
    },
    {
      title: '٧. حقوق الخصوصية',
      blocks: [
        { p: ['بموجب هذه السياسة، يحق للمستهلكين ما يلي:'] },
        {
          list: [
            [
              'مطالبة المنشأة التي تجمع البيانات الشخصية للمستهلك بالإفصاح عن فئات البيانات الشخصية والعناصر المحددة التي جمعتها عنه.',
            ],
            ['مطالبة المنشأة بحذف أي بيانات شخصية تخصّ المستهلك سبق أن جمعتها.'],
            ['إذا قدّمت طلبًا، فأمامنا شهر واحد للرد عليك. وإذا رغبت في ممارسة أيٍّ من هذه الحقوق، يُرجى التواصل معنا.'],
          ],
        },
      ],
    },
    {
      title: '٨. حقوق حماية البيانات',
      blocks: [
        { p: ['نحرص على أن تكون على دراية تامة بجميع حقوقك في حماية البيانات. ولكل مستخدم الحق فيما يلي:'] },
        {
          list: [
            ['حق الوصول – لك الحق في طلب نسخ من بياناتك الشخصية، وقد نفرض رسمًا يسيرًا مقابل هذه الخدمة.'],
            [
              'حق التصحيح – لك الحق في مطالبتنا بتصحيح أي معلومات ترى أنها غير دقيقة، ولك كذلك الحق في مطالبتنا باستكمال المعلومات التي ترى أنها ناقصة.',
            ],
            ['حق المحو – لك الحق في مطالبتنا بمحو بياناتك الشخصية، وفق شروط معيّنة.'],
            ['حق تقييد المعالجة – لك الحق في مطالبتنا بتقييد معالجة بياناتك الشخصية، وفق شروط معيّنة.'],
            ['حق الاعتراض على المعالجة – لك الحق في الاعتراض على معالجتنا لبياناتك الشخصية، وفق شروط معيّنة.'],
            [
              'حق نقل البيانات – لك الحق في مطالبتنا بنقل البيانات التي جمعناها إلى منشأة أخرى أو إليك مباشرة، وفق شروط معيّنة.',
            ],
            ['إذا قدّمت طلبًا، فأمامنا شهر واحد للرد عليك. وإذا رغبت في ممارسة أيٍّ من هذه الحقوق، يُرجى التواصل معنا.'],
          ],
        },
      ],
    },
    {
      title: '٩. معلومات الأطفال',
      blocks: [
        {
          list: [
            [
              'من أولوياتنا كذلك توفير حماية إضافية للأطفال أثناء استخدامهم للإنترنت. ونشجّع الآباء وأولياء الأمور على ملاحظة نشاط أبنائهم على الإنترنت والمشاركة فيه و/أو مراقبته وتوجيهه.',
            ],
            [
              'لا تجمع مي-تكنولوجيز عن علم أي معلومات تُعرّف بالهوية الشخصية من الأطفال دون سن الثالثة عشرة. وإذا كنت تعتقد أن طفلك قدّم مثل هذه المعلومات على موقعنا، فنحثّك بشدّة على التواصل معنا فورًا، وسنبذل قصارى جهدنا لإزالتها من سجلاتنا على وجه السرعة.',
            ],
          ],
        },
      ],
    },
    {
      title: '١٠. الأنظمة واللوائح',
      blocks: [
        {
          list: [
            [
              'يخضع بيان الخصوصية هذا لأنظمة ولوائح المملكة العربية السعودية المتعلقة بحقوق المستهلك والمعلومات السرّية، وتطبَّق أي أنظمة ذات صلة أمام المحاكم المختصة في المملكة.',
            ],
            [
              'بتسجيل الدخول إلى مواقعنا والنقر على «أوافق» أو «أقرّ» بسياسة الخصوصية أو الشروط والأحكام، فإنك تمنح مي-تكنولوجيز جميع الحقوق المذكورة أعلاه وغيرها مع ملفات تعريف الارتباط الأخرى، ما لم يُنص على خلاف ذلك.',
            ],
          ],
        },
      ],
    },
    {
      title: '١١. نقل البيانات عبر الحدود',
      blocks: [
        { p: ['تُعالَج بياناتك وتُخزَّن بشكل أساسي على خوادم آمنة داخل المملكة العربية السعودية.'] },
        {
          p: [
            'وإذا نقلنا بياناتك الشخصية خارج المملكة العربية السعودية، فإننا نضمن توفير درجة حماية مماثلة لها، وذلك بالتأكد من امتثال النقل للإطار التنظيمي لنقل البيانات عبر الحدود بموجب نظام حماية البيانات الشخصية (مثل استخدام الشروط التعاقدية النموذجية المعتمدة من «سدايا»، أو النقل إلى دول توفّر مستوى حماية ملائمًا).',
          ],
        },
      ],
    },
    {
      title: '١٢. أمن البيانات',
      blocks: [
        { p: ['تطبّق مي-تكنولوجيز ممارسات أمنية وفق معايير القطاع لحماية بيانات المستخدمين.'] },
        {
          list: [
            ['تُخزَّن البيانات بشكل آمن على خوادم محمية.'],
            ['نستخدم التشفير والتحقق من الهوية وتقييد صلاحيات الوصول.'],
            ['لا يصل إلى البيانات إلا الموظفون المخوّلون وعند الحاجة فقط.'],
          ],
        },
      ],
    },
    {
      title: '١٣. الاحتفاظ بالبيانات',
      blocks: [
        { p: ['نحتفظ بمعلوماتك طوال المدة اللازمة لتقديم الخدمة أو للامتثال للأنظمة.'] },
        { p: ['وعند حذف الحساب، نقوم بإزالة البيانات الشخصية أو إخفاء هويتها خلال تسعين يومًا.'] },
      ],
    },
    {
      title: '١٤. تحديثات السياسة',
      blocks: [
        {
          p: [
            'قد نراجع سياسة الخصوصية هذه من حين لآخر، وستُنشر أي تحديثات على هذه الصفحة مباشرة مع تحديث تاريخ «آخر تحديث».',
          ],
        },
        { p: ['وسيتم إبلاغك بأي تغييرات جوهرية عبر البريد الإلكتروني أو الإشعارات داخل التطبيق.'] },
        { p: ['ويُعدّ استمرارك في استخدام المنصة قبولًا منك للشروط المحدّثة.'] },
      ],
    },
    {
      title: '١٥. تواصل معنا',
      blocks: [
        {
          p: [
            'جميع ما ورد في هذه الوثيقة بشأن الاستفسارات أو التعديلات أو الحذف أو أي أمر لم يرد له نص فيها، يكون التواصل بشأنه عبر العنوان التالي: ',
            PRIVACY_EMAIL,
          ],
        },
        { p: [{ bold: 'العنوان:' }, ' الدمام، المملكة العربية السعودية'] },
      ],
    },
  ],
}
