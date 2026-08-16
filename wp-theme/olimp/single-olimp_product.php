<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">

<link rel="icon" href="<?php echo esc_url( olimp_asset( 'favicon.svg' ) ); ?>" type="image/svg+xml">
<link rel="apple-touch-icon" href="<?php echo esc_url( olimp_asset( 'apple-touch-icon.png' ) ); ?>">
<meta name="theme-color" content="#B14E2B">


<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>

<header class="topbar">
  <a class="topbar__back" href="./">
    <svg class="topbar__arrow" aria-hidden="true"><use href="<?php echo esc_url( olimp_sprite() ); ?>#i-arrow"/></svg>
    В каталог
  </a>
</header>

<main class="tovar" id="tovar"><?php olimp_product_page(); ?></main>

<?php wp_footer(); ?>
</body>
</html>
