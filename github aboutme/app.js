/* ==========================================================================
   FAY.TRADE PORTFOLIO JAVASCRIPT
   Handles: Navigation, Scroll Animations, Search Lookup, and GIR Wizard
   ========================================================================== */

// --- 1. Commodity Classification Database ---
const COMMODITY_DB = {
    "sourdough bread": {
        code_hs: "1905.90",
        code_ahtn: ".90.90",
        title: "Sourdough Bread (Artisan Loaf)",
        description: "Chapter 19 (Preparations of cereals, flour, starch or milk; pastrycooks' products) > Heading 19.05 (Bread, pastry, cakes, biscuits and other bakers' wares...) > Subheading 1905.90.90 (Other)",
        rule: "GIR 1",
        rationale: "Classified under General Interpretative Rule 1. Sourdough bread is a prepared bakery product fully described by the terms of Heading 19.05 and specifically falls under Subheading 1905.90.90 as a finished foodstuff.",
        thai_hint: "Declared under Thai statistical code 1905.90.90.000. Subject to standard import duty of 30% or 17 Baht/kg. Requires a food import license and clearance certificate from the Thai FDA (Food and Drug Administration)."
    },
    "kitchen knife": {
        code_hs: "8211.92",
        code_ahtn: ".92.91",
        title: "Stainless Steel Kitchen Knife (Plastic Handle)",
        description: "Chapter 82 (Tools, implements, cutlery, spoons and forks of base metal...) > Heading 82.11 (Knives with cutting blades, serrated or not...) > Subheading 8211.92 (Other knives having fixed blades) > AHTN 8211.92.91 (Kitchen knives)",
        rule: "GIR 3(b)",
        rationale: "Classified under GIR 3(b) (Essential Character). The item consists of two materials: a stainless steel blade (Chapter 82) and a plastic handle (Chapter 39). The stainless steel blade provides the cutting function, giving the knife its essential character.",
        thai_hint: "Declared under Thai statistical code 8211.92.91.000. Subject to 10% standard import duty. Subject to standard customs documentation, no special import permits required."
    },
    "smartphone": {
        code_hs: "8517.13",
        code_ahtn: ".13.00",
        title: "Smartphone with AI Processor",
        description: "Chapter 85 (Electrical machinery and equipment and parts thereof...) > Heading 85.17 (Telephone sets, including smartphones...) > Subheading 8517.13.00 (Smartphones)",
        rule: "GIR 1",
        rationale: "Classified under GIR 1. The product is directly described by the text of Heading 85.17 and specifically Subheading 8517.13.00 (Smartphones). Its advanced AI processor or software features do not alter its primary classification as a mobile telecommunication device.",
        thai_hint: "Declared under Thai statistical code 8517.13.00.000. Standard duty rate is Exempt/0% under the Information Technology Agreement (ITA). However, import clearance requires NBTC (National Broadcasting and Telecommunications Commission) radio equipment certification."
    },
    "cotton shirt": {
        code_hs: "6109.10",
        code_ahtn: ".10.20",
        title: "Men's Knitted Cotton T-Shirt",
        description: "Chapter 61 (Articles of apparel and clothing accessories, knitted or crocheted) > Heading 61.09 (T-shirts, singlets and other vests, knitted or crocheted) > Subheading 6109.10 (Of cotton) > AHTN 6109.10.20 (For men or boys)",
        rule: "GIR 1",
        rationale: "Classified under GIR 1. Headings in Chapter 61 are categorized by material composition and styling. Knitted cotton construction places it directly under Heading 61.09, subheading 6109.10, and ASEAN code 6109.10.20.",
        thai_hint: "Declared under Thai statistical code 6109.10.20.000. Subject to standard import duty of 30%. Can claim lower preferential tariff rates (e.g. 0%-5%) if imported from ASEAN/FTA partners with a valid Form D/Form E certificate of origin."
    },
    "electric vehicle": {
        code_hs: "8703.80",
        code_ahtn: ".80.98",
        title: "Electric Passenger Vehicle (Electric SUV)",
        description: "Chapter 87 (Vehicles other than railway or tramway rolling-stock...) > Heading 87.03 (Motor cars and other motor vehicles principally designed for the transport of persons...) > Subheading 8703.80.98 (Other passenger cars, electric propulsion)",
        rule: "GIR 1",
        rationale: "Classified under GIR 1. Heading 87.03 covers motor vehicles for passenger transport. Subheading 8703.80 specifically covers electric motor vehicles. The AHTN code 8703.80.98 covers standard electric passenger automobiles.",
        thai_hint: "Declared under Thai statistical code 8703.80.98.000. General standard duty is 80%, but currently eligible for temporary Thai government EV incentive programs (e.g., duty reduction to 0%-40%) and bilateral FTAs (like ASEAN-China Form E 0% duty)."
    },
    // Extra options for Wizard results
    "steel blade": {
        code_hs: "8208.90",
        code_ahtn: ".90.00",
        title: "Steel Machine Cutting Blade",
        description: "Chapter 82 (Tools, implements, cutlery...) > Heading 82.08 (Knives and cutting blades, for machines or for mechanical appliances) > Subheading 8208.90.00 (Other)",
        rule: "GIR 1",
        rationale: "Classified under GIR 1. The article is a metal blade designed specifically for mechanical cutters, which is directly covered by the text of Heading 82.08.",
        thai_hint: "Declared under Thai statistical code 8208.90.00.000. Standard import duty is 10%. Eligible for duty reduction under manufacturing promotion schemes."
    },
    "gift basket": {
        code_hs: "1905.90",
        code_ahtn: ".90.90",
        title: "Gift Basket of Assorted Fine Biscuits",
        description: "Chapter 19 (Preparations of cereals...) > Heading 19.05 (Bread, pastry, cakes, biscuits...) > Subheading 1905.90.90 (Other)",
        rule: "GIR 3(b)",
        rationale: "Classified under GIR 3(b) (Essential Character) as a retail set. The basket contains biscuits, pastries, and a decorative wicker basket. The bakery products give the set its essential character as a food gift.",
        thai_hint: "Declared under Thai statistical code 1905.90.90.000. Standard duty is 30% on the total value of the set. Requires Thai FDA import notification."
    },
    "mixed fabric suit": {
        code_hs: "6103.32",
        code_ahtn: ".32.00",
        title: "Men's Suit Jacket (60% Cotton, 40% Polyester)",
        description: "Chapter 61 (Articles of apparel...) > Heading 61.03 (Men's or boys' suits, ensembles, jackets...) > Subheading 6103.32.00 (Of cotton)",
        rule: "GIR 3(b)",
        rationale: "Classified under GIR 3(b) (Essential Character). The jacket is made of a blend of cotton (60%) and polyester (40%). The cotton dominates the weight and aesthetic feel, giving the garment its essential character.",
        thai_hint: "Declared under Thai statistical code 6103.32.00.000. Standard duty is 30%. Certificate of origin needed to verify FTA eligibility."
    }
};

// --- 2. DOM Elements ---
document.addEventListener('DOMContentLoaded', () => {
    // Nav Elements
    const navbar = document.querySelector('.navbar');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileNavOverlay = document.querySelector('.mobile-nav-overlay');
    const mobileLinks = document.querySelectorAll('.mobile-link, .mobile-btn');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Tab Elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Search Elements
    const commoditySearch = document.getElementById('commodity-search');
    const searchClearBtn = document.getElementById('search-clear-btn');
    const suggestionTags = document.querySelectorAll('.suggestion-tag');
    
    // Results Elements
    const resultsPlaceholder = document.getElementById('results-placeholder');
    const resultsContent = document.getElementById('results-content');
    const resHsCode = document.getElementById('res-hs-code');
    const resAhtnCode = document.getElementById('res-ahtn-code');
    const resTitle = document.getElementById('res-title');
    const resDescription = document.getElementById('res-description');
    const resRuleTag = document.getElementById('res-rule-tag');
    const resRationale = document.getElementById('res-rationale');
    const resThaiHint = document.getElementById('res-thai-hint');
    
    // Wizard Elements
    const wizCategory = document.getElementById('wiz-category');
    const wizNext1 = document.getElementById('wiz-next-1');
    const wizNext2 = document.getElementById('wiz-next-2');
    const wizNext3 = document.getElementById('wiz-next-3');
    const wizFinish = document.getElementById('wiz-finish');
    const wizPrevBtns = document.querySelectorAll('.wiz-prev');
    const optionCards = document.querySelectorAll('.option-grid .option-card');
    const step3OptionsContainer = document.getElementById('step-3-options');
    const girRulePrompt = document.getElementById('gir-rule-prompt');
    const progressFill = document.querySelector('.progress-fill');
    const progressSteps = document.querySelectorAll('.progress-step');
    
    // Summary Fields
    const sumCategory = document.getElementById('sum-category');
    const sumRule = document.getElementById('sum-rule');
    const sumDetail = document.getElementById('sum-detail');
    
    // Form Elements
    const contactForm = document.getElementById('contact-form');
    const formSuccessMsg = document.getElementById('form-success-msg');
    const formResetBtn = document.getElementById('form-reset-btn');

    // --- 3. Navigation & Header Scroll Behavior ---
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Mobile Menu Toggle
    const toggleMobileMenu = () => {
        mobileMenuToggle.classList.toggle('open');
        mobileNavOverlay.classList.toggle('open');
        document.body.classList.toggle('no-scroll');
    };

    mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mobileNavOverlay.classList.contains('open')) {
                toggleMobileMenu();
            }
        });
    });

    // Active Section Navigation Highlighter
    const sections = document.querySelectorAll('section');
    const navObserverOptions = {
        root: null,
        threshold: 0.6
    };

    const navObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navLinks.forEach(link => {
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
            }
        });
    }, navObserverOptions);

    sections.forEach(section => navObserver.observe(section));

    // Scroll Fade-in Animation (Intersection Observer)
    const animateElements = document.querySelectorAll('.animate-fade-in, .skill-card, .timeline-item, .showcase-card');
    const fadeObserverOptions = {
        root: null,
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const fadeObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('appear');
                observer.unobserve(entry.target); // Trigger only once
            }
        });
    }, fadeObserverOptions);

    animateElements.forEach(el => {
        el.classList.add('animate-fade-in'); // Ensure base class is present
        fadeObserver.observe(el);
    });

    // --- 4. Tabs System ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Toggle active buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Toggle active content
            tabContents.forEach(content => {
                if (content.id === `tab-${targetTab}`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });

    // --- 5. Quick Search Classification System ---
    
    // Heuristic Mock AI Classifier for Arbitrary Products
    const generateMockClassification = (query) => {
        const q = query.toLowerCase();
        
        const foodKeywords = ["cake", "cookie", "bread", "chocolate", "rice", "coffee", "tea", "food", "milk", "cheese", "sauce", "sugar", "fruit", "biscuit", "pastry", "flour", "yeast", "butter", "sourdough", "pasta", "noodle", "beer", "wine", "juice", "beverage", "banana", "apple", "grape", "orange", "meat", "fish"];
        const metalKeywords = ["knife", "blade", "tool", "spoon", "fork", "scissor", "steel", "iron", "metal", "hammer", "screwdriver", "pliers", "wrench", "nail", "screw", "copper", "aluminum", "brass", "key", "lock"];
        const techKeywords = ["phone", "computer", "laptop", "battery", "led", "screen", "wire", "cable", "camera", "sensor", "tv", "television", "charger", "earbuds", "headphone", "device", "tablet", "processor", "chip", "robot", "watch", "smartwatch", "router", "modem"];
        const textileKeywords = ["shirt", "pants", "dress", "socks", "wool", "silk", "cotton", "polyester", "hat", "jacket", "coat", "clothing", "apparel", "fabric", "t-shirt", "jeans", "suit", "scarf", "glove", "shoe", "sneaker", "boot", "bag", "leather"];
        const vehicleKeywords = ["car", "bike", "bicycle", "truck", "motorcycle", "vehicle", "wheel", "scooter", "bus", "engine", "aircraft", "boat", "tire"];

        if (foodKeywords.some(keyword => q.includes(keyword))) {
            return {
                code_hs: "1905.90",
                code_ahtn: ".90.90",
                title: `${query.charAt(0).toUpperCase() + query.slice(1)} (Foodstuff / Agricultural Product)`,
                description: "Chapter 19 (Preparations of cereals, flour, starch or milk; pastrycooks' products) > Heading 19.05 (Bread, pastry, cakes, biscuits and other bakers' wares...)",
                rule: "GIR 1 (Mock AI)",
                rationale: `Classified under GIR 1. The product '${query}' exhibits characteristics of prepared foodstuffs or agricultural products. It fits under Chapter 19 or Chapter 21, and specifically under Heading 19.05 which governs flour-based food preparations.`,
                thai_hint: "Declared under Thai statistical code 1905.90.90.000. Subject to standard import duty of 30% or 17 Baht/kg. Subject to import regulations and clearance from the Thai FDA (Food and Drug Administration)."
            };
        }
        
        if (metalKeywords.some(keyword => q.includes(keyword))) {
            return {
                code_hs: "8211.92",
                code_ahtn: ".92.91",
                title: `${query.charAt(0).toUpperCase() + query.slice(1)} (Metal Article / Cutlery)`,
                description: "Chapter 82 (Tools, implements, cutlery, spoons and forks of base metal...) > Heading 82.11 (Knives with cutting blades...) or Chapter 73 for general articles of steel.",
                rule: "GIR 3(b) (Mock AI)",
                rationale: `Classified under GIR 3(b) (Essential Character) or GIR 1. The product '${query}' is identified as an article of base metal (Chapter 82/73) intended for mechanical work or cutlery utility, where the metal provides its primary character.`,
                thai_hint: "Declared under Thai statistical code 8211.92.91.000. Subject to 10% standard import duty. Subject to standard customs clearance documentation, no import permits required."
            };
        }

        if (techKeywords.some(keyword => q.includes(keyword))) {
            return {
                code_hs: "8517.13",
                code_ahtn: ".13.00",
                title: `${query.charAt(0).toUpperCase() + query.slice(1)} (Electronic / Digital Device)`,
                description: "Chapter 85 (Electrical machinery and equipment and parts thereof; sound recorders and reproducers...) > Heading 85.17 (Smartphones/telephony) or Heading 84.71 (Automatic data processing machines)",
                rule: "GIR 1 (Mock AI)",
                rationale: `Classified under GIR 1. The product '${query}' is an electronic device or accessory falling under Chapter 85/84, which governs telecommunications and automatic data processing machinery.`,
                thai_hint: "Declared under Thai statistical code 8517.13.00.000. Subject to 0% standard import duty under the Information Technology Agreement (ITA). May require NBTC (telecommunications) radio frequency import certification."
            };
        }

        if (textileKeywords.some(keyword => q.includes(keyword))) {
            return {
                code_hs: "6109.10",
                code_ahtn: ".10.20",
                title: `${query.charAt(0).toUpperCase() + query.slice(1)} (Apparel / Textile Article)`,
                description: "Chapter 61 or 62 (Articles of apparel and clothing accessories, knitted or crocheted, or not knitted/crocheted)",
                rule: "GIR 1 (Mock AI)",
                rationale: `Classified under GIR 1. The product '${query}' is classified as an article of apparel or textile material falling under Chapters 61 or 62, which govern worn clothing items based on material, knitting, and styling characteristics.`,
                thai_hint: "Declared under Thai statistical code 6109.10.20.000. Subject to standard import duty of 30%. Preferential rates (0%-5%) apply if imported from FTA partners with a valid Certificate of Origin."
            };
        }

        if (vehicleKeywords.some(keyword => q.includes(keyword))) {
            return {
                code_hs: "8703.80",
                code_ahtn: ".80.98",
                title: `${query.charAt(0).toUpperCase() + query.slice(1)} (Vehicular Transport / Parts)`,
                description: "Chapter 87 (Vehicles other than railway or tramway rolling-stock, and parts and accessories thereof) > Heading 87.03 (Motor cars and passenger vehicles)",
                rule: "GIR 1 (Mock AI)",
                rationale: `Classified under GIR 1. The product '${query}' is identified as a vehicle or part of a transport system, placing it directly under Chapter 87.`,
                thai_hint: "Declared under Thai statistical code 8703.80.98.000. Subject to standard passenger car import duty (80%) or lower rates under regional EV promotion packages."
            };
        }

        // Catch-all general category: plastic articles
        return {
            code_hs: "3926.90",
            code_ahtn: ".90.99",
            title: `${query.charAt(0).toUpperCase() + query.slice(1)} (General Commodity)`,
            description: "Chapter 39 (Plastics and articles thereof) > Heading 39.26 (Other articles of plastics and articles of other materials...)",
            rule: "GIR 1 / 3(b) (Mock AI)",
            rationale: `Classified under GIR 1 or GIR 3(b) based on general composition. The product '${query}' does not map to a specific technical chapter, so it is classified under Chapter 39 as a generic article of plastic/consumer commodity.`,
            thai_hint: "Declared under Thai statistical code 3926.90.99.000. Subject to 20% standard import duty. Subject to standard customs clearance check."
        };
    };

    const showClassificationResult = (productOrKey) => {
        let product;
        if (typeof productOrKey === 'string') {
            product = COMMODITY_DB[productOrKey];
        } else {
            product = productOrKey;
        }
        if (!product) return;
        
        // Populate text content
        resHsCode.textContent = product.code_hs;
        resAhtnCode.textContent = product.code_ahtn;
        resTitle.textContent = product.title;
        resDescription.textContent = product.description;
        resRuleTag.textContent = product.rule;
        resRationale.textContent = product.rationale;
        resThaiHint.textContent = product.thai_hint;
        
        // Style changes on the rule tag
        if (product.rule.startsWith("GIR 1")) {
            resRuleTag.style.background = "rgba(0, 242, 254, 0.15)";
            resRuleTag.style.borderColor = "rgba(0, 242, 254, 0.3)";
            resRuleTag.style.color = "var(--color-accent-teal)";
        } else {
            resRuleTag.style.background = "rgba(245, 166, 35, 0.15)";
            resRuleTag.style.borderColor = "rgba(245, 166, 35, 0.3)";
            resRuleTag.style.color = "var(--color-accent-amber)";
        }
        
        // Swap visibility
        resultsPlaceholder.classList.add('hidden');
        resultsContent.classList.remove('hidden');
        resultsContent.classList.add('animate-fade-in', 'appear');
    };

    const handleSearchInput = () => {
        const query = commoditySearch.value.toLowerCase().trim();
        
        if (query.length > 0) {
            searchClearBtn.style.display = 'block';
            
            // Search matching keys
            let foundKey = "";
            for (let key in COMMODITY_DB) {
                if (key.includes(query) || query.includes(key)) {
                    foundKey = key;
                    break;
                }
            }
            
            if (foundKey) {
                showClassificationResult(foundKey);
            } else {
                // Generate a dynamic fallback report based on search query
                const mockResult = generateMockClassification(commoditySearch.value.trim());
                showClassificationResult(mockResult);
            }
        } else {
            searchClearBtn.style.display = 'none';
            resultsPlaceholder.classList.remove('hidden');
            resultsContent.classList.add('hidden');
        }
    };

    commoditySearch.addEventListener('input', handleSearchInput);
    
    // Clear search button
    searchClearBtn.addEventListener('click', () => {
        commoditySearch.value = "";
        searchClearBtn.style.display = 'none';
        resultsPlaceholder.classList.remove('hidden');
        resultsContent.classList.add('hidden');
        commoditySearch.focus();
    });

    // Suggestion Tag Clicks
    suggestionTags.forEach(tag => {
        tag.addEventListener('click', () => {
            const query = tag.getAttribute('data-query');
            commoditySearch.value = query;
            searchClearBtn.style.display = 'block';
            showClassificationResult(query);
            
            // Switch tabs to search if they clicked while in wizard
            document.querySelector('[data-tab="search"]').click();
        });
    });

    // --- 6. GIR Classification Wizard System ---
    let wizardData = {
        category: "",
        gir1: "",
        secondaryRule: "",
        resolvedProduct: ""
    };

    // Step 1: Category selection
    wizCategory.addEventListener('change', () => {
        if (wizCategory.value) {
            wizNext1.removeAttribute('disabled');
            wizardData.category = wizCategory.value;
        } else {
            wizNext1.setAttribute('disabled', 'true');
        }
    });

    // Step 2 option selection
    const step2Options = document.querySelectorAll('#step-2 .option-card');
    step2Options.forEach(opt => {
        opt.addEventListener('click', () => {
            step2Options.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            wizardData.gir1 = opt.getAttribute('data-val');
            wizNext2.removeAttribute('disabled');
        });
    });

    // Render Step 3 dynamically based on Step 2 choice
    const setupStep3Options = () => {
        step3OptionsContainer.innerHTML = "";
        wizNext3.setAttribute('disabled', 'true');
        wizardData.secondaryRule = "";
        
        if (wizardData.gir1 === "yes") {
            // GIR 1 path (Single Material)
            girRulePrompt.textContent = "Select the primary heading classification description:";
            
            let headings = [];
            if (wizardData.category === "food") {
                headings = [{ val: "sourdough bread", text: "Heading 19.05", desc: "Covers standard bread, pastry, cakes, and other bakers' wares." }];
            } else if (wizardData.category === "metal") {
                headings = [{ val: "steel blade", text: "Heading 82.08", desc: "Covers knives and cutting blades for machines or mechanical appliances." }];
            } else if (wizardData.category === "electronics") {
                headings = [{ val: "smartphone", text: "Heading 85.17", desc: "Covers smartphones and telecommunication transmission devices." }];
            } else if (wizardData.category === "textiles") {
                headings = [{ val: "cotton shirt", text: "Heading 61.09", desc: "Covers T-shirts, singlets, and other vests, knitted or crocheted." }];
            }

            headings.forEach(h => {
                const card = document.createElement('div');
                card.className = 'option-card';
                card.setAttribute('data-val', h.val);
                card.innerHTML = `
                    <h4>${h.text}</h4>
                    <p>${h.desc}</p>
                `;
                card.addEventListener('click', () => {
                    document.querySelectorAll('#step-3 .option-card').forEach(o => o.classList.remove('selected'));
                    card.classList.add('selected');
                    wizardData.secondaryRule = "GIR 1";
                    wizardData.resolvedProduct = h.val;
                    wizNext3.removeAttribute('disabled');
                });
                step3OptionsContainer.appendChild(card);
            });

        } else {
            // GIR 3 path (Composite Goods / Retail Sets)
            girRulePrompt.textContent = "Select the appropriate GIR conflict resolution rule:";
            
            const rules = [
                { val: "3a", text: "GIR 3(a) - Specificity", desc: "Select the heading providing the most specific description over a general one." },
                { val: "3b", text: "GIR 3(b) - Essential Character", desc: "Determine which material or component gives the product its essential character." }
            ];

            rules.forEach(r => {
                const card = document.createElement('div');
                card.className = 'option-card';
                card.setAttribute('data-val', r.val);
                card.innerHTML = `
                    <h4>${r.text}</h4>
                    <p>${r.desc}</p>
                `;
                card.addEventListener('click', () => {
                    document.querySelectorAll('#step-3 .option-card').forEach(o => o.classList.remove('selected-amber'));
                    card.classList.add('selected-amber');
                    wizardData.secondaryRule = `GIR ${r.val.toUpperCase()}`;
                    
                    // Resolve final product based on rules
                    if (wizardData.category === "food") {
                        wizardData.resolvedProduct = "gift basket"; // retail set
                    } else if (wizardData.category === "metal") {
                        wizardData.resolvedProduct = "kitchen knife"; // composite of metal + plastic
                    } else if (wizardData.category === "electronics") {
                        wizardData.resolvedProduct = "electric vehicle"; // electric motor vehicle 8703
                    } else if (wizardData.category === "textiles") {
                        wizardData.resolvedProduct = "mixed fabric suit"; // blend of cotton/poly
                    }
                    wizNext3.removeAttribute('disabled');
                });
                step3OptionsContainer.appendChild(card);
            });
        }
    };

    // Wizard navigation handlers
    const switchWizardStep = (current, target) => {
        document.getElementById(`step-${current}`).classList.remove('active');
        document.getElementById(`step-${target}`).classList.add('active');
        
        // Progress bar states
        progressSteps.forEach((step, idx) => {
            const stepNum = idx + 1;
            if (stepNum < target) {
                step.className = 'progress-step complete';
            } else if (stepNum === target) {
                step.className = 'progress-step active';
            } else {
                step.className = 'progress-step';
            }
        });
        
        // Progress fill width
        const fillPercent = ((target - 1) / 3) * 100;
        progressFill.style.width = `${fillPercent}%`;
    };

    wizNext1.addEventListener('click', () => switchWizardStep(1, 2));
    
    wizNext2.addEventListener('click', () => {
        setupStep3Options();
        switchWizardStep(2, 3);
    });
    
    wizNext3.addEventListener('click', () => {
        // Build summary page details
        sumCategory.textContent = wizCategory.options[wizCategory.selectedIndex].text;
        sumRule.textContent = wizardData.secondaryRule;
        sumDetail.textContent = COMMODITY_DB[wizardData.resolvedProduct] ? COMMODITY_DB[wizardData.resolvedProduct].title : "-";
        
        switchWizardStep(3, 4);
    });

    wizPrevBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = parseInt(btn.getAttribute('data-target'));
            switchWizardStep(target + 1, target);
        });
    });

    wizFinish.addEventListener('click', () => {
        // Display report in results panel
        showClassificationResult(wizardData.resolvedProduct);
        
        // Reset wizard to step 1
        switchWizardStep(4, 1);
        wizCategory.value = "";
        wizNext1.setAttribute('disabled', 'true');
        step2Options.forEach(o => o.classList.remove('selected'));
        wizNext2.setAttribute('disabled', 'true');
        wizardData = { category: "", gir1: "", secondaryRule: "", resolvedProduct: "" };
    });

    // --- 7. Mock Contact Form Submission ---
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Simple visual button loading transition
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalContent = submitBtn.innerHTML;
            submitBtn.innerHTML = `
                Sending message...
                <svg class="animate-float" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="margin-left:8px;">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
                </svg>
            `;
            submitBtn.setAttribute('disabled', 'true');

            // Simulate server network latency (1.5 seconds)
            setTimeout(() => {
                contactForm.classList.add('hidden');
                formSuccessMsg.classList.remove('hidden');
                
                // Clear fields
                contactForm.reset();
                
                // Reset submit button
                submitBtn.innerHTML = originalContent;
                submitBtn.removeAttribute('disabled');
            }, 1500);
        });

        formResetBtn.addEventListener('click', () => {
            formSuccessMsg.classList.add('hidden');
            contactForm.classList.remove('hidden');
        });
    }
});
