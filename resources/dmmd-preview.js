$(function () {
    window.register_dmmd_preview = function ($preview) {
        var $form = $preview.parents('form').first();
        var $update = $preview.find('.dmmd-preview-update');
        var $content = $preview.find('.content');
        var preview_url = $preview.attr('data-preview-url');
        var $textarea = $('#' + $preview.attr('data-textarea-id'));

        $textarea[0].required = false;

        $textarea.keydown(function (ev) {
            if ((ev.metaKey || ev.ctrlKey) && ev.which == 13) {
                $form.submit();
            }
        });

        const editor = new SimpleMDE({ 
            element: $textarea[0],
            toolbar: [
                'bold',
                'italic',
                'strikethrough',
                '|',
                {
                    name: 'mention',
                    action: function (editor) {
                        var cm = editor.codemirror;
                        var doc = cm.getDoc();
                        var cursor = doc.getCursor();
                        var line = doc.getLine(cursor.line);
                        var pos = {
                            line: cursor.line,
                            ch: line.length - 1
                        };
                        doc.replaceRange('[user:username]', pos);
                        cm.focus();
                    },
                    className: 'fa fa-user',
                    title: 'User reference',
                },
                {
                    name: 'latex embed',
                    action: function (editor) {
                        var cm = editor.codemirror;
                        var doc = cm.getDoc();
                        var cursor = doc.getCursor();
                        var line = doc.getLine(cursor.line);
                        var pos = {
                            line: cursor.line,
                            ch: line.length - 1
                        };
                        doc.replaceRange('~x^2~', pos);
                        cm.focus();
                    },
                    className: 'fa fa-superscript',
                    title: 'Latex embed (Ctrl-M)',
                },
                {
                    name: 'latex display embed',
                    action: function (editor) {
                        var cm = editor.codemirror;
                        var doc = cm.getDoc();
                        var cursor = doc.getCursor();
                        var line = doc.getLine(cursor.line);
                        var pos = {
                            line: cursor.line,
                            ch: line.length - 1
                        };
                        doc.replaceRange('$$\npredict(X,W,b)=sigmoid(matmul(X,W)+b)\n$$', pos);
                        cm.focus();
                    },
                    className: 'fa fa-florin-sign',
                    title: 'Latex display embed (Ctrl-Space)',
                },
                '|',
                'heading-1',
                'heading-2',
                'heading-3',
                '|',
                'code',
                'quote',
                'unordered-list',
                'ordered-list',
                '|',
                'link',
                'image',
                'table',
                'horizontal-rule',
                '|',
                'guide',
            ],
         });

        editor.codemirror.on('change', () => {
            $textarea.val(editor.value()).change();
        })

        $update.click(function () {
            var text = $textarea.val();
            if (text) {
                $preview.addClass('dmmd-preview-stale');
                $.post(preview_url, {
                    content: text,
                    csrfmiddlewaretoken: $.cookie('csrftoken')
                }, function (result) {
                    $content.html(result);
                    $preview.addClass('dmmd-preview-has-content').removeClass('dmmd-preview-stale');

                    var $jax = $content.find('.require-mathjax-support');
                    if ($jax.length) {
                        if (!('MathJax' in window)) {
                            $.ajax({
                                type: 'GET',
                                url: $jax.attr('data-config'),
                                dataType: 'script',
                                cache: true,
                                success: function () {
                                    $.ajax({
                                        type: 'GET',
                                        url: 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.0/es5/tex-chtml.min.js',
                                        dataType: 'script',
                                        cache: true,
                                        success: function () {
                                            MathJax.typesetPromise([$content[0]]).then(function () {
                                                $content.find('.tex-image').hide();
                                                $content.find('.tex-text').show();
                                            });
                                        }
                                    });
                                }
                            });
                        } else {
                            MathJax.typesetPromise([$content[0]]).then(function () {
                                $content.find('.tex-image').hide();
                                $content.find('.tex-text').show();
                            });
                        }
                    }
                }).click();
            } else {
                $content.empty();
                $preview.removeClass('dmmd-preview-has-content').removeClass('dmmd-preview-stale');
            }
        });

        var timeout = $preview.attr('data-timeout');
        var last_event = null;
        var last_text = $textarea.val();

        if (timeout) {
            $textarea.change(function () {
                var text = $textarea.val();
                if (last_text == text) return;
                last_text = text;

                $preview.addClass('dmmd-preview-stale');
                if (last_event)
                    clearTimeout(last_event);
                last_event = setTimeout(function () {
                    $update.click();
                    last_event = null;
                }, timeout);
            });
        }
    };

    $('.dmmd-preview').each(function () {
        register_dmmd_preview($(this));
    });

    if ('django' in window && 'jQuery' in window.django)
        django.jQuery(document).on('formset:added', function (event, $row) {
            var $preview = $row.find('.dmmd-preview');
            if ($preview.length) {
                var id = $row.attr('id');
                id = id.substr(id.lastIndexOf('-') + 1);
                $preview.attr('data-textarea-id', $preview.attr('data-textarea-id').replace('__prefix__', id));
                register_dmmd_preview($preview);
            }
        });
});
