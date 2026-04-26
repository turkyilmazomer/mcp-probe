# MCP Tool Eval Report
Generated: 2026-04-25 19:07

**Overall selection accuracy: 119/153 (%78)**

## `get_latest_inflation`
Selection: **8/9** (%89)
- direct: 2/3
- indirect: 3/3
- adversarial: 3/3

Failed prompts:
- "En son Türkiye enflasyon oranı nedir?" → `(none)`

**Description suggestions:**

- Add "Provides the latest inflation rate for Turkey" to emphasize the tool's purpose.
- Include "Use this tool for retrieving the most recent inflation data in Turkey, not for historical data analysis" to clarify its specific use case.
- Mention "Includes monthly and annual changes, and the consumer price index (CPI)" to highlight the specific data provided.
- Rephrase to "Fetches Turkey's latest inflation rate and consumer price index (CPI) details" for clarity and directness.

## `get_education_by_province`
Selection: **7/9** (%78)
- direct: 3/3
- indirect: 3/3
- adversarial: 1/3

Confused with:
- `get_population_by_province` × 2

Failed prompts:
- "Ankara ekonomisi ve eğitim verilerini paylaşır mısınız?" → `get_population_by_province`
- "İstanbul için demografik ve eğitimle ilgili veriler istiyorum." → `get_population_by_province`

**Description suggestions:**

- Add "eğitim verileri" to emphasize the focus on education: "Belirtilen ilin eğitim verilerini ve istatistiklerini getirir."
- Include "demografik" to align with prompts requesting demographic data: "Eğitim ve demografik veriler içerir."
- Disambiguator suggestion: "Eğitimle ilgili veriler için bu aracı kullanın, nüfus verileri için get_population_by_province aracını kullanın."

## `get_population_by_province`
Selection: **9/9** (%100)
- direct: 3/3
- indirect: 3/3
- adversarial: 3/3

## `get_latest_unemployment`
Selection: **7/9** (%78)
- direct: 3/3
- indirect: 2/3
- adversarial: 2/3

Confused with:
- `get_latest_inflation` × 1

Failed prompts:
- "Türkiye'deki işsizlik durumunu takip etmek istiyorum. Son dönem bilgilerini nerede bulabilirim?" → `(none)`
- "Türkiye'deki iş dünyası hakkında en güncel sayılar nelerdir?" → `get_latest_inflation`

**Description suggestions:**

- Add "Bu araç, Türkiye'deki işsizlik durumunu takip etmek isteyenler için idealdir." to clarify its purpose.
- Include "Türkiye'deki iş dünyası hakkında en güncel işsizlik verilerini sağlar." to connect with prompts about business data.
- Add a disambiguator: "Use this for Türkiye'deki işsizlik verileri, not for enflasyon verileri; use get_latest_inflation for enflasyon."

## `compare_province_unemployment_education`
Selection: **5/9** (%56)
- direct: 3/3
- indirect: 1/3
- adversarial: 1/3

Confused with:
- `get_education_by_province` × 1

Failed prompts:
- "Bursa'daki işsizlik sorununu daha iyi anlamak için farklı eğitim seviyelerinin etkisi incelenebilir mi?" → `(none)`
- "Geçmiş yıllarda İzmir'de eğitim ve işsizlik arasındaki ilişkiyi analiz edebilir misiniz?" → `(none)`
- "Eğitim seviyeleriyle ilgili bazı veriler arıyorum, belki İstanbul'da işsizlikle ilgili de olur." → `(none)`
- "Ankara'da eğitim üzerine detaylı bir rapor ve işsizlikle ilgili karşılaştırmalar yapabilir miyiz?" → `get_education_by_province`

**Description suggestions:**

- "Bir ilin işsizlik ve eğitim verilerini bir arada getirir." ifadesini "Bir ilin işsizlik oranları ve farklı eğitim seviyelerine göre dağılımını bir araya getirir." olarak değiştirin.
- "İşsizlik ile eğitim seviyesi arasındaki ilişkiyi analiz etmek için kullanılır." ifadesini "Belirli bir ildeki eğitim seviyelerinin işsizlik üzerindeki etkisini analiz etmek için kullanılır." olarak değiştirin.
- "Geçmiş yıllardaki verileri de kapsar." ifadesini ekleyin.
- "Bu aracı, belirli bir ildeki eğitim seviyelerinin işsizlik üzerindeki etkisini incelemek için kullanın, sadece eğitim verilerini incelemek için get_education_by_province aracını kullanın." şeklinde bir disambiguator ekleyin.

## `get_inflation_by_period`
Selection: **8/9** (%89)
- direct: 3/3
- indirect: 3/3
- adversarial: 2/3

Confused with:
- `get_inflation_by_year` × 1

Failed prompts:
- "Which month in 2021 had significant inflation changes?" → `get_inflation_by_year`

**Description suggestions:**

- Add "Provides detailed monthly inflation data" to emphasize monthly granularity.
- Include "Use this for monthly inflation analysis, not annual summaries" to clarify its specific use case.
- Rephrase to: "Retrieves Türkiye's inflation data for a specified year and month, including monthly change, annual change, 12-month average, and consumer price index. Use this for monthly inflation analysis, not for annual summaries."

## `get_education_comparison`
Selection: **8/9** (%89)
- direct: 3/3
- indirect: 3/3
- adversarial: 2/3

Confused with:
- `compare_province_unemployment_education` × 1

Failed prompts:
- "İstanbul ve Ankara'nın ekonomik durumları ile eğitim seviyelerini 2021 yılında kıyaslar mısın?" → `compare_province_unemployment_education`

**Description suggestions:**

- Add a phrase to specify the focus on educational comparison only: "Ekonomik durum karşılaştırması yapmaz."
- Clarify the scope of the comparison: "Sadece eğitim seviyelerini karşılaştırır."
- Include a note on the data type: "Okuryazarlık, lise, üniversite oranları gibi eğitim verilerini karşılaştırır."
- Disambiguate from similar tools: "Ekonomik durum karşılaştırmaları için bu aracı kullanmayın, bunun yerine 'compare_province_unemployment_education' aracını kullanın."

## `get_education_by_year`
Selection: **4/9** (%44)
- direct: 3/3
- indirect: 1/3
- adversarial: 0/3

Failed prompts:
- "Eğitimdeki yıllık değişimleri anlamak istiyorum. Geçen yılın verileri var mı?" → `(none)`
- "Bu yıl için iller arasında eğitim farklarını analiz etmek istiyorum. Hangi verilere bakabilirim?" → `(none)`
- "Geçmiş yılların eğitim verileri hakkında bilgi verir misiniz?" → `(none)`
- "İllerin eğitim durumunu nasıl karşılaştırabilirim? 2025 yılı için bir şeyler var mı?" → `(none)`
- "Bana bir yıl seç ve o yılın eğitim istatistiklerini göster." → `(none)`

**Description suggestions:**

- "Belirtilen yıla ait tüm illerin eğitim istatistiklerini getirir." ifadesini "Belirtilen yıla ait tüm illerin eğitim istatistiklerini getirir ve yıllık değişimleri analiz etmenizi sağlar." olarak güncelleyin.
- "İller arası eğitim seviyesi karşılaştırması için kullanılır." ifadesini "İller arası eğitim seviyesi farklarını analiz etmek ve geçmiş yılların verilerini incelemek için kullanılır." olarak değiştirin.
- "Geçmiş yılların eğitim verileri hakkında bilgi verir." ifadesini ekleyin.
- "Belirli bir yılın eğitim istatistiklerini görmek için bu aracı kullanın." ifadesini ekleyin.

## `get_unemployment_by_period`
Selection: **8/9** (%89)
- direct: 3/3
- indirect: 3/3
- adversarial: 2/3

Failed prompts:
- "O yılın ilk ayındaki işsizlik oranları ve istihdam hakkında bilgi verir misin?" → `(none)`

**Description suggestions:**

- Add "ilk ay" to clarify that the tool can provide data for the first month of the year: "Türkiye'nin belirtilen yılın ilk ayı dahil olmak üzere herhangi bir ayına ait işsizlik verilerini getirir."
- Include "istihdam" to highlight that employment data is also provided: "İşsizlik oranı, genç işsizlik oranı, işgücüne katılma oranı ve istihdam oranını içerir."
- Mention "veri" to emphasize that the tool provides detailed data: "Belirtilen dönem için işsizlik ve istihdam verilerini sunar."

## `get_inflation_by_year`
Selection: **7/9** (%78)
- direct: 3/3
- indirect: 2/3
- adversarial: 2/3

Failed prompts:
- "Geçen yılın ekonomik trendlerini inceliyorum, aylık enflasyon verilerine nasıl ulaşabilirim?" → `(none)`
- "Merak ediyorum, hangi araçla 2023 yılı için Türkiye'deki enflasyon oranlarını aylık bazda kontrol edebilirim?" → `(none)`

**Description suggestions:**

- "Türkiye'nin belirtilen yıla ait tüm aylık enflasyon (TÜFE) verilerini getirir" ifadesini "Türkiye'nin belirtilen yıla ait tüm aylık enflasyon (TÜFE) verilerini sağlar" olarak değiştirin.
- "Yıl içindeki enflasyon trendini görmek için kullanılır" ifadesini "Yıl içindeki ekonomik trendleri analiz etmek ve aylık enflasyon oranlarını kontrol etmek için kullanılır" olarak genişletin.
- "Geçmiş yılların ekonomik trendlerini incelemek veya belirli bir yıl için aylık enflasyon oranlarını kontrol etmek için bu aracı kullanın" cümlesini ekleyin.
- "2023 yılı için Türkiye'deki aylık enflasyon oranlarını kontrol etmek istiyorsanız, bu aracı kullanın" şeklinde bir açıklama ekleyin.

## `get_province_unemployment_ranking`
Selection: **9/9** (%100)
- direct: 3/3
- indirect: 3/3
- adversarial: 3/3

## `get_province_unemployment`
Selection: **9/9** (%100)
- direct: 3/3
- indirect: 3/3
- adversarial: 3/3

## `get_education_ranking`
Selection: **6/9** (%67)
- direct: 3/3
- indirect: 2/3
- adversarial: 1/3

Confused with:
- `get_education_by_year` × 1

Failed prompts:
- "Son yıllarda hangi şehirler eğitim açısından daha ileride merak ediyorum." → `(none)`
- "Şehirlerde eğitim imkanları 2023 yılında nasıldı?" → `get_education_by_year`
- "Geçmişte hangi illerde daha çok eğitim fırsatı vardı?" → `(none)`

**Description suggestions:**

- Add "Use this for ranking cities by university graduate rates in a specific year" to clarify the tool's purpose.
- Include "Provides insights into which cities have the highest and lowest education levels" to emphasize the tool's output.
- Add "not for general education opportunities or facilities" to distinguish it from tools like "get_education_by_year".
- Specify "Focuses on university graduate rates, not overall education opportunities" to further disambiguate from similar tools.

## `get_population_by_year_range`
Selection: **7/9** (%78)
- direct: 3/3
- indirect: 3/3
- adversarial: 1/3

Failed prompts:
- "Geçmiş yıllarda Türkiye'deki nüfus artışını görebilir miyim?" → `(none)`
- "Ülkenin son yıllardaki büyüme istatistiklerini raporla." → `(none)`

**Description suggestions:**

- "Türkiye'nin belirtilen yıl aralığındaki nüfus verilerini getirir. Geçmiş yıllardaki nüfus artışını ve nüfus değişim trendini görmek için kullanılır."
- "Ülkenin son yıllardaki büyüme istatistiklerini analiz etmek için Türkiye'nin nüfus verilerini sağlar."
- "Use this tool to analyze population growth trends in Türkiye over specific years, not for economic growth statistics."

## `get_population_by_year`
Selection: **5/9** (%56)
- direct: 3/3
- indirect: 2/3
- adversarial: 0/3

Confused with:
- `get_population_by_year_range` × 2

Failed prompts:
- "Geçmiş yıllara ait Türkiye'nin nüfus trendlerini incelemek istiyorum; mesela 1980 yılı." → `(none)`
- "Türkiye'nin 2025'teki nüfusu hakkında herhangi bir tahmin var mı?" → `(none)`
- "Can you tell me if Turkey's population in 2015 was more than in 2014?" → `get_population_by_year_range`
- "Türkiye'nin son 20 yıldaki nüfus değişimleri nasıldı, özellikle 1997?" → `get_population_by_year_range`

**Description suggestions:**

- Add "Geçmiş ve gelecekteki yıllar için nüfus tahminlerini de içerir." to clarify that the tool can provide future population estimates.
- Include "Belirli bir yıl için nüfus verisi almak istediğinizde bu aracı kullanın; birden fazla yıl için get_population_by_year_range kullanın." to differentiate from the get_population_by_year_range tool.
- Add "Yıllık nüfus trendlerini ve karşılaştırmaları incelemek için uygundur." to highlight its suitability for analyzing population trends and comparisons.

## `get_province_unemployment_by_year`
Selection: **4/9** (%44)
- direct: 3/3
- indirect: 0/3
- adversarial: 1/3

Confused with:
- `get_province_unemployment_ranking` × 4

Failed prompts:
- "Geçen yıl hangi illerde işsizlik daha yüksekti?" → `get_province_unemployment_ranking`
- "Bu yılın başında hangi şehirler işsizlikle daha çok boğuşuyordu?" → `get_province_unemployment_ranking`
- "İllerin işsizlik durumu nedir? Özellikle son yıllara odaklanmak istiyorum." → `(none)`
- "Türkiye genelinde işsizlikle ilgili ilginç bilgiler istiyorum. Özellikle iller bazında." → `get_province_unemployment_ranking`
- "Bir önceki yıl hangi bölgelerde işsizlik dikkat çekiciydi?" → `get_province_unemployment_ranking`

**Description suggestions:**

- "Belirtilen yılda tüm illerin işsizlik verilerini getirir" ifadesini "Belirtilen yılda Türkiye'deki tüm illerin işsizlik oranlarını ve verilerini getirir" olarak değiştirin.
- "İller arası işsizlik karşılaştırması için kullanılır" ifadesini "İller arası işsizlik oranlarını karşılaştırmak ve analiz etmek için kullanılır" olarak değiştirin.
- "İşsizlik oranına göre sıralı gelir" ifadesini "İşsizlik oranına göre illeri sıralar ve en yüksekten en düşüğe doğru listeler" olarak değiştirin.
- "Geçmiş yıllara ait verileri analiz etmek için bu aracı kullanın, illerin sıralamasını görmek için get_province_unemployment_ranking aracını kullanın" şeklinde bir disambiguator ekleyin.

## `get_unemployment_by_year`
Selection: **8/9** (%89)
- direct: 3/3
- indirect: 3/3
- adversarial: 2/3

Failed prompts:
- "Aylık ekonomik rapor için geçen yılın işsizlik oranları önemli ama tam hangi aylar olduğuna emin değilim." → `(none)`

**Description suggestions:**

- "Belirtilen yılın tüm aylık işsizlik oranlarını sağlar, belirli bir yıl içindeki işsizlik trendini analiz etmek için kullanılır."
- "Geçmiş yıllara ait aylık işsizlik verilerini elde etmek için bu aracı kullanın; belirli bir yılın tüm aylarını kapsar."
- "Aylık ekonomik raporlar için geçmiş yılın işsizlik oranlarını topluca almak için uygundur."
- "Belirli bir yılın işsizlik oranlarını aylık bazda görmek için bu aracı kullanın; hangi ayların dahil olduğunu belirtmenize gerek yoktur."

