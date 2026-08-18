<?php
/**
 * Мебельный склад «Олимп» — функции темы.
 *
 * Здесь три вещи:
 *   1. Товар и категория как сущности WordPress — то, с чем работает владелец.
 *   2. Подключение собранных стилей и скриптов по манифесту Vite.
 *   3. Печать каталога в разметку блоком JSON — договор описан
 *      в docs/catalog-data.md, менять формат надо с обеих сторон сразу.
 *
 * Разметку главной страницы собирает npm run build:theme из src/index.html —
 * front-page.php править руками не надо, при следующей сборке правки исчезнут.
 *
 * @package Olimp
 */

defined( 'ABSPATH' ) || exit;

const OLIMP_ASSETS = 'assets';

// Коды подтверждения прав в поисковых системах. Их выдают Яндекс.Вебмастер
// и Google Search Console при добавлении сайта — до этого пустые, и тогда
// в разметку ничего не печатается.
const OLIMP_YANDEX_VERIFICATION = '84d9fd413466ff88';
const OLIMP_GOOGLE_VERIFICATION = '';

// Номер счётчика Яндекс.Метрики. Пустой — счётчик не печатается.
const OLIMP_METRIKA_ID = '111394740';

// Каналы приёма заказов на странице товара. Формат телефона 7XXXXXXXXXX,
// без «+» и пробелов.
//
// Те же значения лежат в src/js/state.js — оттуда их берут корзина
// и подвал. Меняешь здесь — поменяй и там: разойдутся, и покупатель
// со страницы товара позвонит по одному номеру, а из корзины по другому.
const OLIMP_ORDER_PHONE = '79620018222';
const OLIMP_MAX_LINK    = 'https://max.ru/u/f9LHodD0cOLisUpMJE-ED8v12sofyDFMOM_cwKS210Zd_F0vBkqmk9mA9mU';

/* -------------------------------------------------------------------------
 *  Адреса собранных файлов
 * ---------------------------------------------------------------------- */

/**
 * Читает манифест сборки. Vite кладёт в имена файлов хеш, чтобы браузер
 * не показывал старые стили после обновления, — значит имена заранее
 * неизвестны и берутся отсюда.
 *
 * @return array<string, array<string, mixed>>
 */
function olimp_manifest() {
	static $manifest = null;

	if ( null === $manifest ) {
		$path     = get_theme_file_path( OLIMP_ASSETS . '/.vite/manifest.json' );
		$manifest = array();

		if ( file_exists( $path ) ) {
			$decoded = json_decode( (string) file_get_contents( $path ), true );
			if ( is_array( $decoded ) ) {
				$manifest = $decoded;
			}
		}
	}

	return $manifest;
}

/**
 * Адрес файла из папки assets темы.
 *
 * @param string $file Имя файла.
 * @return string
 */
function olimp_asset( $file ) {
	return get_theme_file_uri( OLIMP_ASSETS . '/' . ltrim( $file, '/' ) );
}

/**
 * Адрес файла по ключу манифеста. Пустая строка, если сборки нет —
 * тогда страница просто останется без стилей, а не упадёт с ошибкой.
 *
 * @param string $key Ключ в манифесте.
 * @return string
 */
function olimp_built( $key ) {
	$manifest = olimp_manifest();

	return isset( $manifest[ $key ]['file'] ) ? olimp_asset( $manifest[ $key ]['file'] ) : '';
}

/**
 * Адрес спрайта иконок. Шаблон подставляет его в каждый <use>.
 *
 * @return string
 */
function olimp_sprite() {
	return olimp_built( 'spritemap.svg' );
}

/* -------------------------------------------------------------------------
 *  Подключение стилей и скриптов
 * ---------------------------------------------------------------------- */

add_action( 'wp_enqueue_scripts', 'olimp_assets' );

/**
 * Подключает собранные файлы. Версию берём из имени файла — там уже есть хеш,
 * поэтому отдельный параметр ?ver не нужен.
 *
 * @return void
 */
function olimp_assets() {
	$css = olimp_built( 'styles/style.scss' );
	$js  = olimp_built( 'js/main.js' );

	// Отдельного запроса за шрифтами нет: они лежат в папке темы и описаны
	// прямо в собранном CSS. Раньше подключались с fonts.googleapis.com —
	// и IP каждого посетителя уходил за рубеж.

	if ( $css ) {
		wp_enqueue_style( 'olimp', $css, array(), null );
	}

	if ( $js ) {
		wp_enqueue_script( 'olimp', $js, array(), null, true );
	}
}

add_filter( 'script_loader_tag', 'olimp_module_type', 10, 3 );

/**
 * Скрипт собран как модуль ES и без type="module" не запустится.
 *
 * @param string $tag    Готовый тег.
 * @param string $handle Идентификатор скрипта.
 * @param string $src    Адрес файла.
 * @return string
 */
function olimp_module_type( $tag, $handle, $src ) {
	if ( 'olimp' !== $handle ) {
		return $tag;
	}

	return sprintf( '<script type="module" src="%s"></script>' . "\n", esc_url( $src ) );
}

add_action( 'after_setup_theme', 'olimp_setup' );

/**
 * Базовые возможности темы.
 *
 * @return void
 */
function olimp_setup() {
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'html5', array( 'style', 'script' ) );

	// Размеры под карточку и под окно товара. Карточка показывает 4:3,
	// поэтому обрезка включена: иначе вертикальный кадр ломал бы сетку.
	add_image_size( 'olimp-card', 400, 300, true );
	add_image_size( 'olimp-card-2x', 800, 600, true );
	add_image_size( 'olimp-card-3x', 1600, 1200, true );
}

add_filter( 'image_editor_output_format', 'olimp_upload_to_webp' );

/**
 * Нарезки всегда в webp, чем бы ни был загруженный файл.
 *
 * Владелец добавляет товары с телефона, а телефон снимает в jpeg или heic.
 * Ждать, что он каждый раз прогонит снимки через конвертер, бессмысленно:
 * один раз забудет, и на витрине окажется jpeg вдвое тяжелее. Поэтому
 * перекодировкой занимается сайт, а не человек.
 *
 * Своё правило не выдумываем: WordPress сам решает этим фильтром, чем сохранять
 * производные размеры, и по умолчанию переводит heic в jpeg. Мы меняем цель
 * на webp и добавляем в список jpeg с png.
 *
 * Оригинал остаётся в том формате, в каком его загрузили, — фильтр про нарезки.
 * На витрину оригинал не попадает, пока он шире 1600px: тогда создаётся
 * olimp-card-3x и берётся он. Снимок уже 1600px — производных нет, и в разметку
 * уйдёт сам файл. Отсюда правило «грузить от 1600px по длинной стороне».
 *
 * @param array<string, string> $formats Соответствие исходного типа целевому.
 * @return array<string, string>
 */
function olimp_upload_to_webp( $formats ) {
	// Переписываем и то, что WordPress положил сюда сам: heic по умолчанию
	// уходит в jpeg, а нам нужен один формат на всю витрину
	foreach ( array_keys( $formats ) as $type ) {
		$formats[ $type ] = 'image/webp';
	}

	$formats['image/jpeg'] = 'image/webp';
	$formats['image/png']  = 'image/webp';

	return $formats;
}

add_action( 'template_redirect', 'olimp_front_title' );

/**
 * Снимает печать заголовка на главной.
 *
 * Заголовок главной задан прямо в разметке — она собирается из src/index.html,
 * где title стоит рядом с описанием и og-тегами, одним смысловым куском.
 * WordPress с включённым title-tag печатал бы второй, и в head оказывалось
 * два <title>. Убирать сам title-tag нельзя: на остальных страницах заголовок
 * печатать некому.
 *
 * @return void
 */
function olimp_front_title() {
	if ( is_front_page() ) {
		remove_action( 'wp_head', '_wp_render_title_tag', 1 );
	}
}

add_action( 'wp_head', 'olimp_verification', 1 );

/**
 * Мета-теги подтверждения прав для Яндекс.Вебмастера и Google Search Console.
 *
 * Печатаются только заполненные: тег с пустым кодом ничего не подтверждает,
 * а лишняя строка в head ни к чему. После подтверждения теги надо оставить —
 * сервисы перепроверяют их и снимают права, если тег пропал.
 *
 * @return void
 */
function olimp_verification() {
	$codes = array(
		'yandex-verification'      => OLIMP_YANDEX_VERIFICATION,
		'google-site-verification' => OLIMP_GOOGLE_VERIFICATION,
	);

	foreach ( $codes as $name => $code ) {
		if ( '' !== $code ) {
			printf( '<meta name="%s" content="%s">' . "\n", esc_attr( $name ), esc_attr( $code ) );
		}
	}
}

add_action( 'wp_head', 'olimp_metrika', 20 );

/**
 * Счётчик Яндекс.Метрики.
 *
 * Свои визиты не считаем: вошедший в админку — это владелец или разработчик,
 * а не покупатель. На сайте с десятком посетителей в день такие заходы
 * искажают картину сильнее всего.
 *
 * Скрипт грузится асинхронно и отрисовку не задерживает, поэтому стоит
 * в head: чем раньше счётчик проснётся, тем меньше визитов он потеряет.
 *
 * @return void
 */
function olimp_metrika() {
	if ( '' === OLIMP_METRIKA_ID || is_user_logged_in() ) {
		return;
	}

	$id = (int) OLIMP_METRIKA_ID;

	// Код взят из самой Метрики, изменено одно: убран ecommerce:"dataLayer".
	// Он включает сбор покупок, а покупок на сайте нет — заказ оформляется
	// звонком. Пустой отчёт о продажах хуже отсутствующего: на него смотрят
	// и делают выводы из нулей.
	echo <<<HTML
<!-- Yandex.Metrika counter -->
<script>
(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();
for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id={$id}', 'ym');

ym({$id}, 'init', {ssr:true, webvisor:true, clickmap:true});
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/{$id}" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
<!-- /Yandex.Metrika counter -->

HTML;
}

/* -------------------------------------------------------------------------
 *  Товары и категории
 * ---------------------------------------------------------------------- */

add_action( 'init', 'olimp_register_content' );

/**
 * Заводит тип записи «Товары» и таксономию «Категории».
 *
 * Владелец видит минимум: заголовок, изображение и порядок перетаскиванием.
 * Редактор текста отключён намеренно — описание товара на витрине не
 * показывается, а лишнее поле только сбивает с толку.
 *
 * @return void
 */
function olimp_register_content() {
	register_post_type(
		'olimp_product',
		array(
			'label'         => 'Товары',
			'labels'        => array(
				'name'          => 'Товары',
				'singular_name' => 'Товар',
				'add_new'       => 'Добавить товар',
				'add_new_item'  => 'Новый товар',
				'edit_item'     => 'Изменить товар',
				'search_items'  => 'Найти товар',
				'not_found'     => 'Товаров пока нет',
			),
			// У каждого товара свой адрес: /tovar/divan-barselona/.
			//
			// Раньше тип записи был закрыт. Причина звучала разумно —
			// «сайт одностраничный, шаблона нет, адреса ведут на главную», —
			// но это было не решение, а обход недоделки: возможность выключили,
			// чтобы не писать шаблон. Стоило это дорого: сорок один товар
			// и ни одного адреса, который можно отправить покупателю
			// или показать поисковику.
			'public'             => true,
			'publicly_queryable' => true,
			'exclude_from_search' => false,
			'show_ui'            => true,
			'show_in_menu'       => true,
			'menu_icon'          => 'dashicons-store',
			'menu_position'      => 5,
			// page-attributes даёт поле «Порядок» и перетаскивание в списке
			'supports'           => array( 'title', 'thumbnail', 'page-attributes' ),
			// Списка всех товаров по своему адресу нет: его роль играет
			// каталог на главной, с фильтрами и поиском. Вторая такая же
			// страница делила бы с ней поисковый вес.
			'has_archive'        => false,
			// Слаг в единственном числе и без «product»: адрес читает человек,
			// которому его прислали в мессенджере
			'rewrite'            => array(
				'slug'       => 'tovar',
				'with_front' => false,
			),
			'show_in_rest'       => true,
		)
	);

	register_taxonomy(
		'olimp_category',
		'olimp_product',
		array(
			'label'             => 'Категории',
			'labels'            => array(
				'name'          => 'Категории',
				'singular_name' => 'Категория',
				'add_new_item'  => 'Добавить категорию',
			),
			// Своих страниц у категорий тоже нет — фильтрация происходит
			// на главной, без перезагрузки
			'public'             => false,
			'publicly_queryable'  => false,
			'show_ui'            => true,
			'show_in_menu'       => true,
			// Иерархия — как у рубрик: выбор галочками, а не вводом через запятую
			'hierarchical'       => true,
			'show_admin_column'  => true,
			'show_in_rest'       => true,
			'rewrite'            => false,
		)
	);
}

/* -------------------------------------------------------------------------
 *  Поля товара
 * ---------------------------------------------------------------------- */

/**
 * Поля, которые владелец заполняет руками. Всё остальное — цена по запросу,
 * новинка, иконка-заглушка — считается само, чтобы не плодить поля.
 *
 * @return array<string, array<string, string>>
 */
function olimp_fields() {
	return array(
		'olimp_price'     => array(
			'label' => 'Цена, ₽',
			'type'  => 'number',
			'box'   => 'side',
			'hint'  => 'Оставьте пустым — на карточке будет «Цена по запросу»',
		),
		'olimp_old_price' => array(
			'label' => 'Старая цена, ₽',
			'type'  => 'number',
			'box'   => 'side',
			'hint'  => 'Если больше текущей, на карточке появится размер скидки',
		),
		'olimp_specs'     => array(
			'label' => 'Характеристики',
			'type'  => 'textarea',
			// Отдельным блоком под редактором, а не в боковой колонке:
			// сюда вставляют десяток строк из прайса поставщика, в узкую
			// колонку такое не помещается
			'box'   => 'normal',
			'hint'  => 'По строке на характеристику, название и значение через двоеточие: «Ширина, см: 220». Строки без двоеточия пропускаются',
		),
		'olimp_in_stock'  => array(
			'label'   => 'В наличии',
			'type'    => 'checkbox',
			'box'     => 'side',
			'hint'    => 'Снимите галочку — кнопка «В корзину» станет неактивной',
			// Новый товар считаем имеющимся: так чаще всего и есть, а забытая
			// галочка спрятала бы его с витрины
			'default' => true,
		),
		'olimp_is_new'    => array(
			'label'   => 'Новинка',
			'type'    => 'checkbox',
			'box'     => 'side',
			'hint'    => 'Плашка на карточке. Ставьте выборочно: если отметить всё, плашка перестанет что-либо значить',
			// По умолчанию снята: иначе при первом наполнении каталога
			// «Новинка» встала бы на каждый товар разом
			'default' => false,
		),
	);
}

add_action( 'add_meta_boxes', 'olimp_add_meta_box' );

/**
 * Добавляет блок с полями на страницу товара.
 *
 * @return void
 */
function olimp_add_meta_box() {
	add_meta_box( 'olimp-details', 'Цена и наличие', 'olimp_meta_box_side', 'olimp_product', 'side', 'high' );
	add_meta_box( 'olimp-specs', 'Характеристики', 'olimp_meta_box_normal', 'olimp_product', 'normal', 'high' );
}

/**
 * Рисует поля боковой колонки.
 *
 * Nonce печатает только этот блок: он один на всю форму, а форма у страницы
 * записи общая. Напечатать его дважды — значит отправить два поля с одним
 * именем, и до проверки дойдёт только последнее.
 *
 * @param WP_Post $post Текущая запись.
 * @return void
 */
function olimp_meta_box_side( $post ) {
	wp_nonce_field( 'olimp_save_fields', 'olimp_nonce' );
	olimp_meta_box( $post, 'side' );
}

/**
 * Рисует поля под редактором.
 *
 * @param WP_Post $post Текущая запись.
 * @return void
 */
function olimp_meta_box_normal( $post ) {
	olimp_meta_box( $post, 'normal' );
}

/**
 * Рисует поля одного блока.
 *
 * @param WP_Post $post Текущая запись.
 * @param string  $box  Какой блок рисуем: side или normal.
 * @return void
 */
function olimp_meta_box( $post, $box ) {
	foreach ( olimp_fields() as $key => $field ) {
		if ( $field['box'] !== $box ) {
			continue;
		}

		$value = get_post_meta( $post->ID, $key, true );

		echo '<p><label for="' . esc_attr( $key ) . '"><strong>' . esc_html( $field['label'] ) . '</strong></label><br>';

		if ( 'checkbox' === $field['type'] ) {
			// У поля, которое ещё ни разу не сохраняли, берём значение
			// по умолчанию из описания — оно у каждой галочки своё
			$checked = ( '' === $value ) ? $field['default'] : (bool) $value;
			echo '<input type="checkbox" id="' . esc_attr( $key ) . '" name="' . esc_attr( $key ) . '" value="1"' . checked( $checked, true, false ) . '> ';
			echo esc_html( $field['hint'] ) . '</p>';
			continue;
		}

		if ( 'textarea' === $field['type'] ) {
			// esc_textarea, а не esc_attr: значение идёт между тегами,
			// и переводы строк должны сохраниться — иначе весь список
			// характеристик слипнется в одну строку при каждом открытии
			echo '<textarea class="widefat" id="' . esc_attr( $key ) . '" name="' . esc_attr( $key ) . '" rows="10">' . esc_textarea( (string) $value ) . '</textarea>';
			echo '<span class="description">' . esc_html( $field['hint'] ) . '</span></p>';
			continue;
		}

		echo '<input type="number" class="widefat" id="' . esc_attr( $key ) . '" name="' . esc_attr( $key ) . '" value="' . esc_attr( (string) $value ) . '" min="0" step="1">';
		echo '<span class="description">' . esc_html( $field['hint'] ) . '</span></p>';
	}
}

add_action( 'save_post_olimp_product', 'olimp_save_fields' );

/**
 * Сохраняет поля.
 *
 * @param int $post_id Идентификатор записи.
 * @return void
 */
function olimp_save_fields( $post_id ) {
	// Автосохранение шлёт неполную форму — записав её, мы стёрли бы поля
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}

	$nonce = isset( $_POST['olimp_nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['olimp_nonce'] ) ) : '';

	if ( ! wp_verify_nonce( $nonce, 'olimp_save_fields' ) || ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}

	foreach ( olimp_fields() as $key => $field ) {
		if ( 'checkbox' === $field['type'] ) {
			update_post_meta( $post_id, $key, isset( $_POST[ $key ] ) ? '1' : '0' );
			continue;
		}

		if ( 'textarea' === $field['type'] ) {
			// sanitize_textarea_field, а не sanitize_text_field: второй вырезает
			// переводы строк, и десять характеристик превратились бы в одну
			// строку без разделителей — разобрать её обратно уже нечем
			$text = isset( $_POST[ $key ] ) ? sanitize_textarea_field( wp_unslash( $_POST[ $key ] ) ) : '';

			if ( '' === trim( $text ) ) {
				delete_post_meta( $post_id, $key );
				continue;
			}

			update_post_meta( $post_id, $key, $text );
			continue;
		}

		$raw = isset( $_POST[ $key ] ) ? sanitize_text_field( wp_unslash( $_POST[ $key ] ) ) : '';

		if ( '' === $raw ) {
			// Пустое поле — это «цены нет», а не «цена ноль»
			delete_post_meta( $post_id, $key );
			continue;
		}

		update_post_meta( $post_id, $key, absint( $raw ) );
	}
}

/* -------------------------------------------------------------------------
 *  Каталог для фронтенда
 * ---------------------------------------------------------------------- */

/**
 * Иконка категории. Отдельного поля в админке нет намеренно: владелец не
 * должен знать имена картинок в спрайте. Имя берётся из слага, а там, где
 * слаг и картинка называются по-разному, работает таблица соответствий.
 *
 * Слаг, которому не нашлось картинки, получает коробку — это заметно,
 * но не ломает вёрстку.
 *
 * @param string $slug Слаг категории.
 * @return string
 */
function olimp_icon( $slug ) {
	// Картинки, которые есть в спрайте
	$known = array( 'sofa', 'armchair', 'table', 'chair', 'bed', 'wardrobe', 'shelf', 'dresser', 'box', 'lamp' );

	// Слаг по смыслу, картинка по виду: «шкафы» рисуются гардеробом,
	// «кухни» — стеллажом, потому что своей картинки для них пока нет
	$aliases = array(
		'storage' => 'wardrobe',
		'shkafy'  => 'wardrobe',
		'kitchen' => 'shelf',
		'kuhni'   => 'shelf',
		'divany'  => 'sofa',
		'stoly'   => 'table',
		'krovati' => 'bed',
		'komody'  => 'dresser',
		'stulya'  => 'chair',
		'kresla'  => 'armchair',
	);

	if ( isset( $aliases[ $slug ] ) ) {
		return $aliases[ $slug ];
	}

	return in_array( $slug, $known, true ) ? $slug : 'box';
}

/**
 * Категории в том виде, в каком их ждёт фронтенд.
 *
 * @return array<int, array<string, string>>
 */
function olimp_categories() {
	$terms = get_terms(
		array(
			'taxonomy'   => 'olimp_category',
			'hide_empty' => true,
			'orderby'    => 'term_order',
		)
	);

	if ( is_wp_error( $terms ) ) {
		return array();
	}

	$out = array();

	foreach ( $terms as $term ) {
		$out[] = array(
			'id'    => $term->slug,
			'label' => $term->name,
			'icon'  => olimp_icon( $term->slug ),
		);
	}

	return $out;
}

/**
 * Разбирает характеристики из текстового поля в пары «название — значение».
 *
 * Владелец вставляет их строками из прайса поставщика, как есть:
 *
 *     Ширина, см: 220
 *     Наполнитель: пружинный блок, войлок, пенополиуретан
 *
 * Отдельных полей под каждый размер нет намеренно: набор характеристик
 * у дивана и у шкафа разный, и фиксированная форма показывала бы на шкафу
 * пустые «ширина спального места». Заодно так добавляются характеристики,
 * о которых мы сейчас не знаем, — без правки темы.
 *
 * Двоеточие ищем первое: значение вроде «Механизм: дельфин, тик-так»
 * может содержать свои знаки, и делить надо один раз.
 *
 * @param string $raw Содержимое поля.
 * @return array<int, array<string, string>>
 */
function olimp_parse_specs( $raw ) {
	$out = array();

	// \R ловит любой перевод строки: у вставленного из Word и из мессенджера
	// они разные, а строки должны разобраться одинаково.
	//
	// Модификатор u обязателен. Без него регулярка работает по байтам, а \R
	// среди прочего означает \x85 — второй байт буквы «х» в UTF-8. Регулярка
	// принимала середину буквы за перевод строки и резала слово: «Механизм»
	// превращался в «анизм», и характеристика уезжала под чужим названием.
	// На битой кодировке preg_split с модификатором u возвращает false,
	// а обход false в PHP 8 — фатальная ошибка, то есть белый экран вместо
	// каталога. Лучше показать товар без характеристик, чем уронить витрину
	$lines = preg_split( '/\R/u', (string) $raw );

	if ( ! is_array( $lines ) ) {
		return $out;
	}

	foreach ( $lines as $line ) {
		if ( ! str_contains( $line, ':' ) ) {
			continue;
		}

		list( $name, $value ) = explode( ':', $line, 2 );

		$name  = trim( $name );
		$value = trim( $value );

		if ( '' === $name || '' === $value ) {
			continue;
		}

		$out[] = array(
			'name'  => $name,
			'value' => $value,
		);
	}

	return $out;
}

/**
 * Товары в том виде, в каком их ждёт фронтенд.
 *
 * @return array<int, array<string, mixed>>
 */
function olimp_products() {
	$posts = get_posts(
		array(
			'post_type'      => 'olimp_product',
			'post_status'    => 'publish',
			'numberposts'    => -1,
			'orderby'        => array( 'menu_order' => 'ASC', 'date' => 'DESC' ),
		)
	);

	$total = count( $posts );
	$out   = array();

	foreach ( $posts as $index => $post ) {
		$terms = get_the_terms( $post->ID, 'olimp_category' );
		$slug  = ( is_array( $terms ) && $terms ) ? $terms[0]->slug : '';

		// Без категории товар не покажется ни в одном фильтре — пропускаем,
		// чтобы он не висел в счётчике невидимкой
		if ( '' === $slug ) {
			continue;
		}

		$price = get_post_meta( $post->ID, 'olimp_price', true );
		$old   = get_post_meta( $post->ID, 'olimp_old_price', true );
		$stock = get_post_meta( $post->ID, 'olimp_in_stock', true );
		$isnew = get_post_meta( $post->ID, 'olimp_is_new', true );

		$item = array(
			'id'    => $post->ID,
			// Адрес страницы товара. Отдаём готовым, а не собираем в скрипте:
			// слаг может быть каким угодно, а постоянные ссылки настраиваются
			// в админке — угадать адрес на стороне браузера неоткуда
			'url'   => get_permalink( $post ),
			'name'  => $post->post_title,
			'cat'   => $slug,
			'old'   => ( '' === $old ) ? null : (int) $old,
			// Товар, у которого галочку ни разу не трогали, считаем в наличии
			'stock' => ( '' === $stock ) ? true : ( '1' === $stock ),
			// Порядок перетаскиванием в админке — он же порядок «по популярности»
			'pop'   => $total - $index,
			// Плашку ставит владелец галочкой. Раньше она считалась по дате
			// публикации — и при первом наполнении каталога встала на все
			// товары разом: плашка на всём ничего не выделяет
			'isNew' => '1' === $isnew,
			'img'   => olimp_icon( $slug ),
		);

		if ( '' !== $price ) {
			$item['price'] = (int) $price;
		}

		// Ключа specs у товара без характеристик нет вовсе — фронтенд
		// проверяет наличие, а не длину, и пустой массив рисовал бы
		// заголовок «Характеристики» над пустотой
		$specs = olimp_parse_specs( get_post_meta( $post->ID, 'olimp_specs', true ) );

		if ( $specs ) {
			$item['specs'] = $specs;
		}

		$thumb = get_post_thumbnail_id( $post->ID );

		if ( $thumb ) {
			$src    = wp_get_attachment_image_src( $thumb, 'olimp-card-2x' );
			$srcset = wp_get_attachment_image_srcset( $thumb, 'olimp-card-2x' );

			if ( $src ) {
				$item['photo'] = $src[0];
			}

			if ( $srcset ) {
				$item['srcset'] = $srcset;
			}
		}

		$out[] = $item;
	}

	return $out;
}

/* -------------------------------------------------------------------------
 *  Каталог в разметке — для поисковиков и для работы без скриптов
 *
 *  Скрипт при загрузке перерисует эти же блоки и дальше ведёт их сам:
 *  фильтры, сортировка, порции. Но до того, как он отработает, страница
 *  уже содержит названия товаров и категорий. Без этого поисковик видел
 *  страницу про мебель вообще, без единого товара — Google дорисовывает
 *  такое вторым заходом с задержкой в дни, а Яндекс чаще не дорисовывает.
 *
 *  ВАЖНО: разметка ниже повторяет шаблоны из src/js/catalog.js и
 *  src/js/cats.js. Меняешь там — поменяй и здесь, иначе на мгновение
 *  после загрузки страница дёрнется, подменив одну вёрстку другой.
 * ---------------------------------------------------------------------- */

// Сколько карточек рисуем сразу — столько же, сколько показывает скрипт
const OLIMP_PAGE = 24;

/**
 * Цена в рублях: «78 990 ₽» с неразрывными пробелами, как в utils.js.
 *
 * @param int $n Сумма.
 * @return string
 */
function olimp_price( $n ) {
	return number_format( (int) $n, 0, ',', "\u{00A0}" ) . "\u{00A0}₽";
}

/**
 * Плашка на карточке: скидка, новинка или хит — в этом порядке.
 *
 * @param array $p Товар.
 * @return string
 */
function olimp_badge( $p ) {
	if ( ! empty( $p['old'] ) && isset( $p['price'] ) ) {
		$off = (int) round( ( 1 - $p['price'] / $p['old'] ) * 100 );
		return '<span class="badge badge--sale">−' . $off . '%</span>';
	}
	if ( ! empty( $p['isNew'] ) ) {
		return '<span class="badge badge--new">Новинка</span>';
	}
	if ( isset( $p['pop'] ) && $p['pop'] >= 88 ) {
		return '<span class="badge">Хит</span>';
	}
	return '';
}

/**
 * Печатает первую порцию карточек.
 *
 * @return void
 */
function olimp_cards() {
	$products = array_slice( olimp_products(), 0, OLIMP_PAGE );

	// Описывает нашу сетку — то же значение, что в catalog.js
	$sizes = '(min-width: 1100px) 320px, (min-width: 640px) 45vw, 90vw';

	foreach ( $products as $i => $p ) {
		$name  = esc_attr( $p['name'] );
		$delay = min( $i * 45, 360 );

		if ( ! empty( $p['photo'] ) ) {
			$srcset = empty( $p['srcset'] ) ? '' :
				' srcset="' . esc_attr( $p['srcset'] ) . '" sizes="' . esc_attr( $sizes ) . '"';
			$media  = '<img class="card__photo" src="' . esc_url( $p['photo'] ) . '" alt="' . $name . '"' . $srcset . ' loading="lazy">';
		} else {
			$media = '<svg class="card__illustration" viewBox="0 0 200 150" role="img" aria-label="' . $name . '">'
				. '<use href="' . esc_url( olimp_sprite() ) . '#i-' . esc_attr( $p['img'] ) . '"/></svg>';
		}

		$add = $p['stock']
			? '<button class="add" type="button" data-add="' . (int) $p['id'] . '">'
				. '<svg class="icon add__icon" aria-hidden="true"><use href="' . esc_url( olimp_sprite() ) . '#i-bag"/></svg>В корзину</button>'
			: '<button class="add" type="button" disabled>Нет в наличии</button>';

		$price = isset( $p['price'] )
			? '<span class="price__now">' . esc_html( olimp_price( $p['price'] ) ) . '</span>'
				. ( empty( $p['old'] ) ? '' : '<s class="price__old">' . esc_html( olimp_price( $p['old'] ) ) . '</s>' )
			: '<span class="price__ask">Цена по запросу</span>';

		// Ссылок на товар две: фотография и название. Люди жмут и туда, и туда,
		// а когда ссылкой была только картинка, нажатие по названию не делало
		// ничего — выглядело как поломка сайта.
		//
		// Фотография убрана из обхода табом и от скринридера: она ведёт туда же,
		// куда название, и вторая остановка на том же адресе только удлиняет
		// путь с клавиатуры.
		$url = esc_url( get_permalink( $p['id'] ) );

		echo '
	<article class="card" data-id="' . (int) $p['id'] . '" style="animation-delay:' . (int) $delay . 'ms">
		<a class="card__media' . ( empty( $p['photo'] ) ? '' : ' card__media--photo' ) . '"
			href="' . $url . '" tabindex="-1" aria-hidden="true">
			<span class="card__badges">' . olimp_badge( $p ) . '</span>
			' . $media . '
		</a>
		<div class="card__body">
			<h3 class="card__name"><a class="card__link" href="' . $url . '">' . esc_html( $p['name'] ) . '</a></h3>
			<div class="card__row">
				<div class="price">' . $price . '</div>
				' . $add . '
			</div>
		</div>
	</article>';
	}
}

/**
 * Печатает плитки категорий под героем.
 *
 * @return void
 */
function olimp_tiles() {
	foreach ( olimp_categories() as $c ) {
		echo '
	<button class="cat reveal" type="button" data-cat="' . esc_attr( $c['id'] ) . '">
		<svg class="cat__icon" viewBox="0 0 200 150" aria-hidden="true"><use href="'
			. esc_url( olimp_sprite() ) . '#i-' . esc_attr( $c['icon'] ) . '"/></svg>
		<span class="cat__label">' . esc_html( $c['label'] ) . '</span>
	</button>';
	}
}

/**
 * Печатает переключатели категорий в фильтрах. «Все» — не категория,
 * а снятый фильтр, поэтому добавляется отдельно и первым.
 *
 * @return void
 */
function olimp_chips() {
	$items = array_merge( array( array( 'id' => 'all', 'label' => 'Все' ) ), olimp_categories() );

	foreach ( $items as $c ) {
		$checked = ( 'all' === $c['id'] ) ? ' checked' : '';
		// Одной строкой: .chip — строчный элемент, перенос между полем
		// и подписью браузер показал бы лишним пробелом внутри плашки
		echo '<label class="chip"><input class="chip__input" type="radio" name="cat" value="'
			. esc_attr( $c['id'] ) . '"' . $checked . '><span class="chip__label">'
			. esc_html( $c['label'] ) . '</span></label>';
	}
}

/**
 * Печатает счётчик найденного.
 *
 * @return void
 */
function olimp_count() {
	$total = count( olimp_products() );
	echo 'Показано: <b class="toolbar__found">' . (int) min( $total, OLIMP_PAGE ) . '</b> из ' . (int) $total;
}

/**
 * Печатает каталог блоком JSON. Его ищет data.js; формат описан
 * в docs/catalog-data.md.
 *
 * JSON_HEX_TAG обязателен: без него название товара с последовательностью
 * </script> закрыло бы блок раньше времени и разорвало страницу.
 *
 * @return void
 */
function olimp_catalog_json() {
	$data = array(
		'categories' => olimp_categories(),
		'products'   => olimp_products(),
	);

	echo '<script type="application/json" id="catalog-data">'
		. wp_json_encode( $data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE )
		. '</script>' . "\n";
}

/* -------------------------------------------------------------------------
 *  Страница товара
 * ---------------------------------------------------------------------- */

/**
 * Печатает содержимое страницы товара.
 *
 * Разметку сюда вставляет single-olimp_product.php, который собирается
 * из src/tovar.html. Классы те же, что у макета, — стили одни на оба случая.
 *
 * Печатаем на сервере, а не скриптом: страница товара существует ради того,
 * чтобы её нашли в поиске и открыли по ссылке из мессенджера. Разметка,
 * появляющаяся после JS, ни того, ни другого не даёт.
 *
 * @return void
 */
function olimp_product_page() {
	$id    = get_the_ID();
	$name  = get_the_title();
	$specs = olimp_parse_specs( get_post_meta( $id, 'olimp_specs', true ) );
	$price = get_post_meta( $id, 'olimp_price', true );
	$stock = get_post_meta( $id, 'olimp_in_stock', true );
	$terms = get_the_terms( $id, 'olimp_category' );
	$cat   = ( is_array( $terms ) && $terms ) ? $terms[0] : null;

	echo '<nav class="crumbs" aria-label="Хлебные крошки"><a class="crumbs__link" href="'
		. esc_url( home_url( '/' ) ) . '">Каталог</a>';

	if ( $cat ) {
		echo '<span class="crumbs__sep" aria-hidden="true">›</span><span class="crumbs__current">'
			. esc_html( $cat->name ) . '</span>';
	}

	echo '</nav><div class="tovar__grid"><div class="tovar__media">';
	olimp_product_gallery( $id, $name );
	echo '</div><div class="tovar__info"><h1 class="tovar__name">' . esc_html( $name ) . '</h1>';

	olimp_product_size( $specs );

	echo '' === $price
		? '<p class="tovar__price tovar__price--ask">Цена по запросу</p>'
		: '<p class="tovar__price">' . esc_html( olimp_price( (int) $price ) ) . '</p>';

	// Товар, у которого галочку ни разу не трогали, считаем в наличии —
	// так же, как в каталоге
	echo ( '' === $stock || '1' === $stock )
		? '<p class="tovar__stock">Есть в наличии</p>'
		: '<p class="tovar__stock tovar__stock--out">Нет в наличии</p>';

	printf(
		'<div class="tovar__order"><a class="btn btn--primary" href="tel:+%1$s">Позвонить</a>'
			. '<a class="btn" href="%2$s" target="_blank" rel="noopener">Написать в MAX</a></div>',
		esc_attr( OLIMP_ORDER_PHONE ),
		esc_url( OLIMP_MAX_LINK )
	);

	olimp_product_specs( $specs );

	echo '</div></div>';
}

/**
 * Галерея снимков товара.
 *
 * Первый снимок — изображение записи, остальные берём из прикреплённых
 * к записи файлов: их владелец загружает через ту же кнопку «Добавить медиа»,
 * отдельного поля под каждый снимок заводить не надо.
 *
 * Разметка совпадает с той, что печатает src/js/gallery.js: переключение
 * снимков включает тот же скрипт, он ищет .gallery на любой странице.
 *
 * @param int    $id   Номер записи.
 * @param string $name Название товара для подписи.
 * @return void
 */
function olimp_product_gallery( $id, $name ) {
	$ids = array();
	$thumb = get_post_thumbnail_id( $id );

	if ( $thumb ) {
		$ids[] = (int) $thumb;
	}

	foreach ( get_attached_media( 'image', $id ) as $file ) {
		if ( ! in_array( (int) $file->ID, $ids, true ) ) {
			$ids[] = (int) $file->ID;
		}
	}

	if ( ! $ids ) {
		printf(
			'<svg class="tovar__illustration" viewBox="0 0 200 150" role="img" aria-label="%1$s"><use href="%2$s#i-box"/></svg>',
			esc_attr( $name ),
			esc_url( olimp_sprite() )
		);
		return;
	}

	$sizes = '(min-width: 900px) 520px, 92vw';

	// Один снимок — ни миниатюр, ни стрелок: переключать нечего. А обёртку
	// печатаем всё равно: снимок лежит position: absolute, и без
	// .gallery__stage ему не от чего отсчитывать inset — он растягивается
	// на всю страницу. Ровно это и было у комода с единственной фотографией.
	$one = 1 === count( $ids );

	echo '<div class="gallery"><div class="gallery__stage">';

	foreach ( $ids as $i => $shot ) {
		echo wp_get_attachment_image( $shot, 'olimp-card-3x', false, array(
			'class'   => 'gallery__photo' . ( $i ? '' : ' gallery__photo--active' ),
			'alt'     => 0 === $i ? $name : $name . ' — снимок ' . ( $i + 1 ),
			'sizes'   => $sizes,
			'loading' => $i ? 'lazy' : 'eager',
		) );
	}

	if ( $one ) {
		echo '</div></div>';
		return;
	}

	// Стрелки нужны только там, где нет мыши: стили показывают их
	// при hover: none. Печатаем всегда — какое устройство у посетителя,
	// на сервере неизвестно
	foreach ( array( 'prev' => -1, 'next' => 1 ) as $dir => $shift ) {
		printf(
			'<button class="gallery__arrow gallery__arrow--%1$s" type="button" data-step="%2$d" aria-label="%3$s"><svg class="gallery__chevron" aria-hidden="true"><use href="%4$s#i-chevron"/></svg></button>',
			esc_attr( $dir ),
			$shift,
			'prev' === $dir ? 'Предыдущий снимок' : 'Следующий снимок',
			esc_url( olimp_sprite() )
		);
	}

	echo '</div><div class="gallery__thumbs">';

	foreach ( $ids as $i => $shot ) {
		printf(
			'<button class="gallery__thumb%1$s" type="button" aria-label="Снимок %2$d из %3$d">',
			$i ? '' : ' gallery__thumb--on',
			$i + 1,
			count( $ids )
		);

		// Размер под миниатюру, а не полный кадр: 400px хватает на 72px
		// с запасом под ретину, а полноразмерный снимок тянул бы мегабайты
		// ради ногтя. alt пустой намеренно — подпись уже в кнопке, и дублировать
		// её значит заставить скринридер прочитать одно и то же дважды
		echo wp_get_attachment_image( $shot, 'olimp-card', false, array(
			'class' => 'gallery__thumb-img',
			'alt'   => '',
		) );

		echo '</button>';
	}

	echo '</div></div>';
}

/**
 * Габариты одной строкой: «220 × 97 × 83 см».
 *
 * Первое, что спрашивает покупатель мебели, — поместится ли она. Ничего
 * не печатаем, если нашлись не все три: два размера из трёх не отвечают
 * ни на что, а выдумывать третий нельзя.
 *
 * @param array<int, array<string, string>> $specs Характеристики товара.
 * @return void
 */
function olimp_product_size( $specs ) {
	$want  = array( 'Ширина, см', 'Глубина, см', 'Высота, см' );
	$found = array();

	foreach ( $want as $name ) {
		foreach ( $specs as $s ) {
			if ( $name === $s['name'] ) {
				$found[] = $s['value'];
				break;
			}
		}
	}

	if ( count( $found ) !== count( $want ) ) {
		return;
	}

	$parts = array();

	foreach ( $found as $v ) {
		$parts[] = esc_html( $v );
	}

	echo '<p class="size">' . implode( ' <span class="size__x">×</span> ', $parts )
		. '<span class="size__unit">см</span></p>';
}

/**
 * Таблица характеристик. Габариты из неё убраны — они напечатаны строкой выше,
 * и те же три числа не должны стоять на экране дважды.
 *
 * @param array<int, array<string, string>> $specs Характеристики товара.
 * @return void
 */
function olimp_product_specs( $specs ) {
	$dims = array( 'Ширина, см', 'Глубина, см', 'Высота, см' );
	$have = 0;

	foreach ( $specs as $s ) {
		if ( in_array( $s['name'], $dims, true ) ) {
			++$have;
		}
	}

	$rows = array();

	foreach ( $specs as $s ) {
		if ( count( $dims ) === $have && in_array( $s['name'], $dims, true ) ) {
			continue;
		}

		$rows[] = $s;
	}

	if ( ! $rows ) {
		echo '<p class="tovar__nospecs">Характеристики пока не заполнены.</p>';
		return;
	}

	echo '<dl class="specs">';

	foreach ( $rows as $s ) {
		echo '<div class="specs__row"><dt class="specs__name">' . esc_html( $s['name'] )
			. '</dt><dd class="specs__value">' . esc_html( $s['value'] ) . '</dd></div>';
	}

	echo '</dl>';
}
