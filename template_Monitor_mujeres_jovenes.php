<?php
/*
Template Name: Monitor Mujeres Jovenes
Template Post Type: page, post
Description: Embebe el dashboard de Mujeres Jovenes desde Vercel sin interferir con estilos del sitio padre.
*/
get_header();
get_website_header();

$dashboard_url = 'https://mujeres-jovenes.vercel.app/';

wp_register_style('monitor-mujeres-jovenes-template', false);
wp_enqueue_style('monitor-mujeres-jovenes-template');
wp_add_inline_style('monitor-mujeres-jovenes-template', "
  /* Todos los estilos quedan encapsulados dentro de .primary_monitor_mj */
  .primary_monitor_mj .page_content_container,
  .primary_monitor_mj .site-main,
  .primary_monitor_mj .content-area,
  .primary_monitor_mj .site-content,
  .primary_monitor_mj .site-content .wrap,
  .primary_monitor_mj .container,
  .primary_monitor_mj .wrapper {
    width: 100% !important;
    max-width: 100% !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    box-sizing: border-box;
  }

  .primary_monitor_mj .page_content_container_wrapper {
    width: min(100%, 1880px);
    margin-inline: auto;
    padding: 0;
    box-sizing: border-box;
  }

  .primary_monitor_mj .mj_embed_shell {
    width: 100%;
  }

  .primary_monitor_mj .mj_embed_frame_wrap {
    width: 100%;
    border: 0;
    border-radius: 0;
    overflow: hidden;
    background: transparent;
  }

  .primary_monitor_mj .mj_embed_iframe {
    display: block;
    width: 100%;
    min-height: 760px;
    height: calc(100vh - 140px);
    max-height: 1800px;
    border: 0;
    background: #fff;
  }

  @media (max-width: 1024px) {
    .primary_monitor_mj .mj_embed_iframe {
      min-height: 680px;
      height: calc(100vh - 120px);
      max-height: 1600px;
    }
  }

  @media (max-width: 760px) {
    .primary_monitor_mj .mj_embed_iframe {
      min-height: 620px;
      height: calc(100vh - 100px);
      max-height: 1500px;
    }
  }
");
?>

<input type="hidden" class="associated_page"
  original="<?php echo esc_url(get_permalink($post->ID)); ?>"
  value="<?php echo esc_url(get_permalink($post->ID)); ?>">

<div id="primary" class="content-area primary_monitor_mj">
  <main id="main" class="site-main" role="main">
    <div class="page_content_container">
      <div class="page_content_container_wrapper">
        <section class="mj_embed_shell" aria-label="Dashboard Mujeres Jovenes">
          <div class="mj_embed_frame_wrap">
            <iframe
              id="mj_dashboard_iframe"
              class="mj_embed_iframe"
              src="<?php echo esc_url($dashboard_url); ?>"
              title="Dashboard Mujeres Jovenes"
              loading="lazy"
              referrerpolicy="strict-origin-when-cross-origin"
              allow="fullscreen"
            ></iframe>
          </div>
        </section>
      </div>
    </div>
  </main>
</div>

<?php
wp_register_script('monitor-mj-template-js', false, array(), null, true);
wp_enqueue_script('monitor-mj-template-js');
wp_add_inline_script('monitor-mj-template-js', "
  (function () {
    var iframe = document.getElementById('mj_dashboard_iframe');
    if (!iframe) return;
    var useAutoHeightFromChild = false;

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function resizeIframeFallback() {
      var rect = iframe.getBoundingClientRect();
      var available = window.innerHeight - rect.top - 20;
      var isMobile = window.innerWidth <= 760;
      var min = isMobile ? 620 : 760;
      var max = isMobile ? 1500 : 1800;
      iframe.style.height = clamp(available, min, max) + 'px';
    }

    // Soporte opcional para auto-height si el app embebido decide enviar postMessage.
    window.addEventListener('message', function (event) {
      if (!useAutoHeightFromChild) return;
      if (!event || !event.data || typeof event.data !== 'object') return;
      if (event.data.type !== 'mj:resize') return;
      if (typeof event.data.height !== 'number') return;

      var isMobile = window.innerWidth <= 760;
      var min = isMobile ? 620 : 760;
      var max = isMobile ? 2000 : 2600;
      iframe.style.height = clamp(Math.round(event.data.height), min, max) + 'px';
    });

    window.addEventListener('load', resizeIframeFallback);
    window.addEventListener('resize', function () {
      window.clearTimeout(window.__mjResizeTmr);
      window.__mjResizeTmr = window.setTimeout(resizeIframeFallback, 120);
    });
    resizeIframeFallback();
    window.setTimeout(resizeIframeFallback, 500);
    window.setTimeout(resizeIframeFallback, 1200);
  })();
");
get_footer();
?>
