---
title: EasyExcel工具类
date: 2023-05-17 17:36:47
permalink: /pages/ee2523/
tags:

- EasyExcel
- 导入
- 导出
author:
  name: benym
  link: https://github.com/benym
---
## 起步依赖
```bash
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>easyexcel</artifactId>
    <version>3.3.1</version>
</dependency>
```
## EasyExcelUtil
```java
import com.alibaba.excel.EasyExcel;
import com.alibaba.excel.write.metadata.style.WriteCellStyle;
import com.alibaba.excel.write.metadata.style.WriteFont;
import com.alibaba.excel.write.style.HorizontalCellStyleStrategy;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.CollectionUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.servlet.http.HttpServletResponse;
import java.net.URLEncoder;
import java.util.List;
import java.util.Objects;

/**
 * Excel工具类
 */
public class EasyExcelUtil {

    private static final Logger LOGGER = LoggerFactory.getLogger(EasyExcelUtil.class);

    private EasyExcelUtil() {
        throw new IllegalStateException("工具类禁止实例化");
    }

    /**
     * 导出
     *
     * @param clazz    clazz
     * @param dataList dataList
     * @param fileName fileName
     * @param <T>      <T>
     */
    public static <T> void export(Class<T> clazz, List<T> dataList, String fileName) {
        try {
            HttpServletResponse response = ((ServletRequestAttributes) Objects.
                    requireNonNull(RequestContextHolder.getRequestAttributes())).getResponse();
            if (response != null && !CollectionUtils.isEmpty(dataList)) {
                LOGGER.info("当前导出文件为:{}, size:{}", fileName, dataList.size());
                // 设置头的样式
                WriteCellStyle headWriteCellStyle = new WriteCellStyle();
                WriteFont headWriteFont = new WriteFont();
                headWriteFont.setFontHeightInPoints((short) 11);
                headWriteCellStyle.setWriteFont(headWriteFont);
                // 设置内容的样式
                WriteCellStyle contentWriteCellStyle = new WriteCellStyle();
                contentWriteCellStyle.setVerticalAlignment(VerticalAlignment.CENTER);
                response.setContentType("application/x-download");
                response.addHeader("Content-Disposition",
                        "attachment;filename=" + URLEncoder.encode(fileName, "UTF-8") + ".xlsx");
                EasyExcel.write(response.getOutputStream(), clazz)
                        .registerWriteHandler(new EasyExcelAutoWidthStrategy())
                        .registerWriteHandler(new HorizontalCellStyleStrategy(headWriteCellStyle, contentWriteCellStyle))
                        .sheet("Sheet")
                        .doWrite(dataList);
            } else {
                LOGGER.warn("获取不到response，dataList:{}", dataList);
            }
        } catch (Exception e) {
            throw ExceptionFactory.bizException("导出异常", e);
        }
    }
    
    /**
     * 导出文件并上传至文件存储
     *
     * @param clazz    解析的Class
     * @param dataList 数据实体
     * @param fileName 导出文件名
     * @param pathNum  上传路径
     * @param <T>      <T>
     * @return 文件存储中的路径
     */
    public static <T> String exportAndUpload(Class<T> clazz, List<T> dataList, String fileName, Integer pathNum) {
        try {
            HttpServletResponse response = ((ServletRequestAttributes) Objects.
                    requireNonNull(RequestContextHolder.getRequestAttributes())).getResponse();
            if (response != null && !CollectionUtils.isEmpty(dataList)) {
                LOGGER.info("当前导出文件为:{}, size:{}", fileName, dataList.size());
                // 创建临时文件
                File unUploadFile = File.createTempFile(fileName, ".xlsx");
                // 设置头的样式
                WriteCellStyle headWriteCellStyle = new WriteCellStyle();
                WriteFont headWriteFont = new WriteFont();
                headWriteFont.setFontHeightInPoints((short) 11);
                headWriteFont.setBold(false);
                headWriteCellStyle.setWriteFont(headWriteFont);
                // 设置内容的样式
                WriteCellStyle contentWriteCellStyle = new WriteCellStyle();
                contentWriteCellStyle.setVerticalAlignment(VerticalAlignment.CENTER);
                EasyExcel.write(unUploadFile, clazz)
                        .registerWriteHandler(new EasyExcelAutoWidthStrategy())
                        .registerWriteHandler(new HorizontalCellStyleStrategy(headWriteCellStyle, contentWriteCellStyle))
                        .sheet("Sheet")
                        .doWrite(dataList);
                byte[] fileData = FileUtil.readBytes(unUploadFile);
                // 这里编写你上传文件存储的逻辑，可使用fileData或File，上文已进行文件流写入
                String uploadedUrl = "";
                FileUtil.del(unUploadFile);
                return uploadedUrl;
            } else {
                LOGGER.info("获取不到response，dataList:{}", dataList);
                return "";
            }
        } catch (Exception e) {
            throw ExceptionFactory.bizException("导出异常", e);
        }
    }
    
    /**
     * 解析Excel文件并校验
     *
     * @param file           前端上传的文件
     * @param clazz          解析后的实体
     * @param readListener   读监听者
     * @param <T>            <T>
     */
    public static <T> void upload(MultipartFile file, Class<T> clazz, ReadListener<T> readListener) {
        try {
            if (file != null && !file.isEmpty()) {
                byte[] fileData = file.getBytes();
                EasyExcel.read(file.getInputStream(), clazz, readListener).sheet().doRead();
                // 这里编写你上传至存储服务器的代码，传递file即可，这里的file已经进行了读取并校验
            }
            LOGGER.info("file is empty，skip upload");
            return "";
        } catch (IOException ioException) {
            throw ExceptionFactory.sysException("上传时异常", ioException);
        } catch (Exception e) {
            throw ExceptionFactory.sysException("上传未知异常", e);
        }
    }
    
    /**
     * 读取Excel数据到class
     * 
     * @param inputStream inputStream
     * @param clazz clazz
     * @return List<T>
     * @param <T> <T>
     */
    public static <T> List<T> parseExcel(InputStream inputStream, Class<T> clazz) {
        List<T> parsedData = new ArrayList<>();
        EasyExcel.read(inputStream, clazz, new AnalysisEventListener<T>() {
            @Override
            public void invoke(T data, AnalysisContext context) {
                parsedData.add(data);
            }

            @Override
            public void doAfterAllAnalysed(AnalysisContext context) {
                LOGGER.info("解析excel完成");
            }
        }).sheet().doRead();
        return parsedData;
    }
    
}
```

## 自适应宽度策略

```java
import com.alibaba.excel.enums.CellDataTypeEnum;
import com.alibaba.excel.metadata.Head;
import com.alibaba.excel.metadata.data.CellData;
import com.alibaba.excel.metadata.data.WriteCellData;
import com.alibaba.excel.write.metadata.holder.WriteSheetHolder;
import com.alibaba.excel.write.style.column.AbstractColumnWidthStyleStrategy;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.poi.ss.usermodel.Cell;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * EasyExcel自适应宽度策略
 */
public class EasyExcelAutoWidthStrategy extends AbstractColumnWidthStyleStrategy {

    /**
     * 可以根据这里的最大宽度，按自己需要进行调整
     */
    private static final int MAX_COLUMN_WIDTH = 30;
    private final Map<Integer, Map<Integer, Integer>> cache = new HashMap<>(8);

    @Override
    protected void setColumnWidth(WriteSheetHolder writeSheetHolder, List<WriteCellData<?>> cellDataList, Cell cell, Head head, Integer relativeRowIndex, Boolean isHead) {
        boolean needSetWidth = isHead || !CollectionUtils.isEmpty(cellDataList);
        if (needSetWidth) {
            Map<Integer, Integer> maxColumnWidthMap = cache
                    .computeIfAbsent(writeSheetHolder.getSheetNo(), k -> new HashMap<>(16));
            Integer columnWidth = this.dataLength(cellDataList, cell, isHead);
            if (columnWidth >= 0) {
                if (columnWidth > MAX_COLUMN_WIDTH) {
                    columnWidth = MAX_COLUMN_WIDTH;
                }
                Integer maxColumnWidth = (Integer) ((Map<?, ?>) maxColumnWidthMap).get(cell.getColumnIndex());
                if (maxColumnWidth == null || columnWidth > maxColumnWidth) {
                    maxColumnWidthMap.put(cell.getColumnIndex(), columnWidth);
                    writeSheetHolder.getSheet().setColumnWidth(cell.getColumnIndex(), columnWidth * 256);
                }
            }
        }
    }

    private Integer dataLength(List<WriteCellData<?>> cellDataList, Cell cell, Boolean isHead) {
        if (Boolean.TRUE.equals(isHead)) {
            return cell.getStringCellValue().getBytes().length;
        } else {
            CellData<?> cellData = cellDataList.get(0);
            CellDataTypeEnum type = cellData.getType();
            if (type == null) {
                return -1;
            } else {
                switch (type) {
                    case STRING:
                        return cellData.getStringValue().getBytes().length;
                    case BOOLEAN:
                        return cellData.getBooleanValue().toString().getBytes().length;
                    case NUMBER:
                        return cellData.getNumberValue().toString().getBytes().length;
                    default:
                        return -1;
                }
            }
        }
    }

}
```

## 样例导出实体

```java
import com.alibaba.excel.annotation.ExcelIgnoreUnannotated;
import com.alibaba.excel.annotation.ExcelProperty;
import com.alibaba.excel.annotation.format.NumberFormat;
import com.alibaba.excel.annotation.write.style.ColumnWidth;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;

/**
 * 导出DTO
 */
@ExcelIgnoreUnannotated
@Data
public class ExportDTO implements Serializable {

    private static final long serialVersionUID = 3470002146742757218L;

    /**
     * 第一列
     */
    @ExcelProperty(value = "第一列")
    private String test;

    /**
     * 第二列
     */
    @ExcelProperty(value = "第二列")
    private Long test2;

    /**
     * 第三列，指定列宽20
     */
    @ExcelProperty(value = "第三列")
    @ColumnWidth(20)
    private String test3;

    /**
     * 性别 [man=男，woman=女]
     */
    @ExcelProperty(value = "性别", converter = GenderConverter.class)
    private String gender;

    /**
     * 金额，指定保留2位小数
     */
    @ExcelProperty(value = "金额")
    @NumberFormat("0.00")
    private BigDecimal price;
}
```

## 自定义Converter

```java
import com.alibaba.excel.converters.Converter;
import com.alibaba.excel.converters.WriteConverterContext;
import com.alibaba.excel.enums.CellDataTypeEnum;
import com.alibaba.excel.metadata.data.WriteCellData;

/**
 * 转换性别字段
 */
public class GenderConverter implements Converter<String> {

    /**
     * 支持的Java类型
     *
     * @return Class<?>
     */
    @Override
    public Class<?> supportJavaTypeKey() {
        return String.class;
    }

    /**
     * 支持的Excel内容类型
     *
     * @return CellDataTypeEnum
     */
    @Override
    public CellDataTypeEnum supportExcelTypeKey() {
        return CellDataTypeEnum.STRING;
    }

    /**
     * 转化数据到Excel数据的策略
     *
     * @param context context
     * @return WriteCellData<?>
     * @throws Exception
     */
    @Override
    public WriteCellData<?> convertToExcelData(WriteConverterContext<String> context) throws Exception {
        return new WriteCellData<>(GenderEnum.getEnumsByCode(context.getValue()).getDesc());
    }
    
    /**
     * 转换为Java数据，用于导入
     *
     * @param context 上下文
     * @return {@link String}
     * @throws Exception 异常
     */
    @Override
    public String convertToJavaData(ReadConverterContext<?> context) throws Exception {
        return GenderEnum.getEnumsByDesc(context.getReadCellData().getStringValue()).getCode();
    }
    
}
```

## 样例性别枚举类

```java
/**
 * 性别枚举类
 */
public enum GenderEnum {
    /**
     * 男
     */
    MAN("man", "男"),
    /**
     * 女
     */
    WOMAN("woman", "女");

    GenderEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    private static final Map<String, GenderEnum> CODE_MAP = new ConcurrentHashMap<>();
    
    private static final Map<String, GenderEnum> DESC_MAP = new ConcurrentHashMap<>();

    static {
        for (GenderEnum genderEnum : EnumSet.allOf(GenderEnum.class)) {
            CODE_MAP.put(genderEnum.getCode(), genderEnum);
            DESC_MAP.put(genderEnum.getDesc(), genderEnum);
        }
    }

    public static GenderEnum getEnumsByCode(String code) {
        return CODE_MAP.get(code);
    }
    
    public static GenderEnum getEnumsByDesc(String desc) {
        return DESC_MAP.get(code);
    }

    /**
     * code
     */
    private String code;

    /**
     * message
     */
    private String desc;

    public String getCode() {
        return code;
    }

    public String getDesc() {
        return desc;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public void setDesc(String desc) {
        this.desc = desc;
    }
}
```
## 自定义ReadListener

```java
import com.alibaba.excel.context.AnalysisContext;
import com.alibaba.excel.read.listener.ReadListener;
import com.alibaba.excel.read.metadata.holder.ReadRowHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.validation.ConstraintViolation;
import javax.validation.Validation;
import javax.validation.Validator;
import java.util.Set;

/**
 * Listener
 * 用于上传Excel时，对Excel文件的校验或落库
 *
 */
public class ExcelBatchAuditValidListener implements ReadListener<UploadDTO> {

    private static final Logger LOGGER = LoggerFactory.getLogger(ExcelBatchAuditValidListener.class);

    private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();

    @Override
    public void invoke(UploadDTO uploadDTO, AnalysisContext analysisContext) {
        // 获取当前解析行
        ReadRowHolder readRowHolder = analysisContext.readRowHolder();
        Integer rowIndex = readRowHolder.getRowIndex();
        LOGGER.info("当前解析数据: {}, 行号: {}", uploadDTO.toString(), rowIndex);
        // 执行javax校验
        Set<ConstraintViolation<UploadDTO>> validateSet = VALIDATOR.validate(uploadDTO);
        for (ConstraintViolation<UploadDTO> result : validateSet) {
            throw ExceptionFactory.bizNoStackException("第" + rowIndex + "行数据格式错误, " + result.getMessage());
        }
    }

    @Override
    public void doAfterAllAnalysed(AnalysisContext analysisContext) {
        LOGGER.info("所有数据校验完成");
    }
}
```

## 样例上传实体

```java
/**
 * 样例上传DTO
 */
public class UploadDTO implements Serializable {

    private static final long serialVersionUID = -4321582750193296175L;

    /**
     * id
     */
    @NotNull(message = "id为必填")
    @ExcelProperty(value = "Id")
    private Long Id;
}
```