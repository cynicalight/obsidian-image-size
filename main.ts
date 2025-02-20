import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, FileManager, TFile } from 'obsidian';


interface ImageSizeSettings {
	imageSize: string;
	imagePath: string;
	useWikiLinks?: boolean;
	useDirectoryTravel?: boolean;
}

const DEFAULT_SETTINGS: ImageSizeSettings = {
	imageSize: '550',
	imagePath: 'img',
	useWikiLinks: false,
	useDirectoryTravel: true
}


export default class ImageSize extends Plugin {
	settings: ImageSizeSettings;

	async onload() {
		console.log('loading plugin image size');
		await this.loadSettings();


		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ImageSizeSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});


		this.registerEvent(
			this.app.workspace.on("editor-paste", async (evt: ClipboardEvent, editor: Editor) => {
				const items = evt.clipboardData?.items;
				const fm = this.app.fileManager;
				
				if (items) {
					for (let i = 0; i < items.length; i++) {
						const item = items[i];
						if (item.type.startsWith("image/")) {
							// 阻止默认粘贴行为
							evt.preventDefault();

							const file = item.getAsFile();
							if (file) {
								const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
								if (!editor) return;

								// 生成图片名称
								const now = new Date();
								const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
								const imageName = `Pasted image ${timestamp}.png`;
								const imageNameMd = `Pasted%20image%20${timestamp}.png`;

								// 检查文件是否存在
								const fileExists = await this.app.vault.adapter.exists(imageName);
								if (!fileExists) {
									// 将图片保存到文件系统
									const arrayBuffer = await file.arrayBuffer();
									const data = new Uint8Array(arrayBuffer);
									const imagePath = `${this.settings.imagePath}/${imageName}`;
									await this.app.vault.createBinary(imagePath, data);
								} else {
									console.log("File already exists.");
								}

								const tfile = this.app.vault.getAbstractFileByPath(`${this.settings.imagePath}/${imageName}`) as TFile;

								// 插入 Markdown 图片链接或 Wiki 链接
								const cursor = editor.getCursor();
								const activeFile = this.app.workspace.getActiveFile();
								if (!activeFile) return;
								const markdownImage = fm.generateMarkdownLink(tfile, activeFile.path, '', this.settings.imageSize);
				
								editor.replaceRange(markdownImage, cursor);
								// 移动光标至行尾
								editor.setCursor({ line: cursor.line, ch: cursor.ch + markdownImage.length });
							}
							break; // 只处理第一个图片
						}
					}
				}
			})
		);
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class ImageSizeSettingTab extends PluginSettingTab {
	plugin: ImageSize;

	constructor(app: App, plugin: ImageSize) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Default image size')
			.setDesc('Set the default size for pasted images (e.g., 550)')
			.addText(text => text
				.setPlaceholder('Enter size like 600')
				.setValue(this.plugin.settings.imageSize || '550')
				.onChange(async (value) => {
					this.plugin.settings.imageSize = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Image path')
			.setDesc("Set the default path for pasted images (e.g., img), better be the same as the attachment folder in your settings.")
			.addText(text => text
				.setPlaceholder('Enter path like img')
				.setValue(this.plugin.settings.imagePath || 'img')
				.onChange(async (value) => {
					this.plugin.settings.imagePath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Add "../../../../../../" to the image path in md mode')
			.setDesc("If you want to directly push your md to your blog via hugo, I recommand you to set the image path as ../../../../../../img.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useDirectoryTravel ?? true)
				.onChange(async (value) => {
					this.plugin.settings.useDirectoryTravel = value;
					await this.plugin.saveSettings();
				}));


				
	}
}
