import nunjucks from 'nunjucks';

// Install Jinja compatibility for Nunjucks
nunjucks.installJinjaCompat();

// Template string (Jinja2 format)
const template = `{{ bos_token }}
{% if messages[0]['role'] == 'system' %}
    {{ raise_exception('System role not supported') }}
{% endif %}
{% for message in messages %}
    {% if (message['role'] == 'user') != (loop.index0 % 2 == 0) %}
        {{ raise_exception('Conversation roles must alternate user/assistant/user/assistant/...') }}
    {% endif %}
    {% if (message['role'] == 'assistant') %}
        {% set role = 'model' %}
    {% else %}
        {% set role = message['role'] %}
    {% endif %}
    {{ '<start_of_turn>' + role + '\n' + message['content'] | trim + '<end_of_turn>\n' }}
{% endfor %}
{% if add_generation_prompt %}
    {{ '<start_of_turn>model\n' }}
{% endif %}`;

/**
 * Renders the provided template with the given context.
 * @param context - The context object containing variables for the template.
 * @returns The rendered template output.
 */
export function renderTemplate(context: Record<string, any>): string {
    try {
        // Render the template with the provided context
        return nunjucks.renderString(template, context);
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'message' in error) {
            return `Error: ${(error as Error).message}`;
        } else {
            return 'An unknown error occurred.';
        }
    }
}

// Example usage
const context = {
    bos_token: '<BOS>',
    messages: [
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: 'Hi there!' },
    ],
    add_generation_prompt: true,
};

console.log(renderTemplate(context));
